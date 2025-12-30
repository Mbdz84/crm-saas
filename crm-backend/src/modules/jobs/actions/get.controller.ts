import { Request, Response } from "express";
import prisma from "../../../prisma/client";
import { ensureJobExtensions } from "./extension.controller";


/* ============================================================
   GET ALL JOBS (JOB BOARD)
============================================================ */
export async function getJobs(req: Request, res: Response) {
  try {
    const jobs = await prisma.job.findMany({
      where: { companyId: req.user!.companyId },

      orderBy: [
        // Group by status order first
        { jobStatus: { order: "asc" } },

        // Then newest first
        { createdAt: "desc" },
      ],

      include: {
        technician: true,
        jobType: true,
        source: true,
        jobStatus: {
          select: {
            id: true,
            name: true,
            color: true,
            order: true,
            active: true,
            locked: true,
          },
        },
      },
    });

    res.json(jobs);
  } catch (err) {
    console.error("🔥 GET JOBS ERROR:", err);
    res.status(500).json({ error: "Failed to load jobs" });
  }
}

/* ============================================================
   GET SINGLE JOB (DETAIL PAGE)
============================================================ */
export async function getJobByShortId(req: Request, res: Response) {
  try {
    const job = await prisma.job.findFirst({
      where: {
        shortId: req.params.shortId.toUpperCase(),
        companyId: req.user!.companyId,
      },

      include: {
        technician: true,
        jobType: true,
        source: true,

        jobStatus: {
          select: {
            id: true,
            name: true,
            color: true,
            order: true,
            active: true,
            locked: true,
          },
        },

        closing: true,

        logs: {
          include: { user: true },
        },

        // 🔑 IMPORTANT FIX: RETURN ALL EXTENSIONS PER PHONE
        callSessions: {
          where: { active: true },
  orderBy: { createdAt: "asc" },
  select: {
    id: true,
    extension: true,
    customerPhone: true,
    clientPhoneType: true, // ✅ REQUIRED
    active: true,          // ✅ FUTURE SAFE
  },
},

        records: {
          orderBy: { createdAt: "desc" },
        },

        reminders: {
          orderBy: { scheduledFor: "asc" },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

// ✅ Ensure masked call extensions exist (phone1 + phone2)
await ensureJobExtensions(job.id);

    res.json(job);
  } catch (err) {
    console.error("🔥 GET JOB ERROR:", err);
    res.status(500).json({ error: "Failed to load job" });
  }
}