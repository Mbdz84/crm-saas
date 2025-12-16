import { Request, Response } from "express";
import prisma from "../../../prisma/client";

export async function getJobs(req: Request, res: Response) {
  try {
    const jobs = await prisma.job.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { createdAt: "desc" },
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

        callSessions: {
          orderBy: { createdAt: "desc" },
        },

        records: {
          orderBy: { createdAt: "desc" },
        },
        reminders: {
  orderBy: { scheduledFor: "asc" },
},
      },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });

    res.json(job);
  } catch (err) {
    console.error("🔥 GET JOB ERROR:", err);
    res.status(500).json({ error: "Failed to load job" });
  }
}