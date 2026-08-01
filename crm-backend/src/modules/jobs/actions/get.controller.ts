import { Request, Response } from "express";
import prisma from "../../../prisma/client";
import { ensureJobExtensions } from "./extension.controller";
import {
  ownJobsWhere,
  hideClientPhone,
  maskJobPhone,
  jobViewer,
} from "../../../utils/scope";


/* ============================================================
   GET ALL JOBS (JOB BOARD)
============================================================ */
export async function getJobs(req: Request, res: Response) {
  try {
    const isTech =
      req.user?.role === "technician" || req.user?.role === "dispatcher";

    const jobs = await prisma.job.findMany({
      where: { companyId: req.user!.companyId, ...(await ownJobsWhere(req)) },

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
        // Technicians dial through the masked number + extension, so pull this
        // tech's active call sessions to build a tel-safe masked dial string.
        ...(isTech
          ? {
              callSessions: {
                where: { active: true, technicianId: req.user!.id },
                select: { extension: true, clientPhoneType: true },
              },
            }
          : {}),
      },
    });

    // Attach maskedDial / maskedDial2 for technician requesters.
    if (isTech) {
      const me = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { maskedTwilioPhoneNumber: true },
      });
      const maskedDigits = (me?.maskedTwilioPhoneNumber || "").replace(
        /[^\d]/g,
        ""
      );

      if (maskedDigits) {
        for (const job of jobs as any[]) {
          const sessions = job.callSessions || [];
          const primary = sessions.find(
            (s: any) => s.clientPhoneType === "primary"
          );
          const secondary = sessions.find(
            (s: any) => s.clientPhoneType === "secondary"
          );
          job.maskedDial = primary?.extension
            ? `${maskedDigits},${primary.extension}`
            : null;
          job.maskedDial2 = secondary?.extension
            ? `${maskedDigits},${secondary.extension}`
            : null;
        }
      }
    }

    if (await hideClientPhone(req)) jobs.forEach(maskJobPhone);

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
        ...(await ownJobsWhere(req)),
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

    if (await hideClientPhone(req)) maskJobPhone(job);

    // Hide Log / Recordings data (and tell the UI to hide those tabs).
    const viewer = await jobViewer(req);
    if (!viewer.canSeeLogs) (job as any).logs = [];
    if (!viewer.canSeeRecordings) (job as any).records = [];
    (job as any).viewer = viewer;

    res.json(job);
  } catch (err) {
    console.error("🔥 GET JOB ERROR:", err);
    res.status(500).json({ error: "Failed to load job" });
  }
}