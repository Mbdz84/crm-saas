import { Request, Response } from "express";
import prisma from "../../../prisma/client";

export class DeleteController {
  static async deleteJob(req: Request, res: Response) {
    try {
      const { shortId } = req.params;

      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Lookup by shortId + company
      const job = await prisma.job.findFirst({
        where: { shortId, companyId: req.user.companyId },
      });

      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }

      const jobId = job.id;

      // IMPORTANT: cascade delete using a transaction
      await prisma.$transaction([
        prisma.jobLog.deleteMany({ where: { jobId } }),
        prisma.jobCallSession.deleteMany({ where: { jobId } }),
        prisma.jobRecord.deleteMany({ where: { jobId } }),
        prisma.jobClosing.deleteMany({ where: { jobId } }),
        prisma.job.delete({ where: { id: jobId } }),
      ]);

      return res.json({ success: true });
    } catch (err) {
      console.error("❌ DELETE JOB ERROR:", err);
      return res.status(500).json({ error: "Failed to delete job" });
    }
  }

  static async bulkDeleteJobs(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { shortIds } = req.body || {};
      if (!Array.isArray(shortIds) || shortIds.length === 0) {
        return res.status(400).json({ error: "No jobs selected" });
      }

      // Only jobs that belong to this company
      const jobs = await prisma.job.findMany({
        where: { shortId: { in: shortIds }, companyId: req.user.companyId },
        select: { id: true },
      });
      const jobIds = jobs.map((j) => j.id);

      if (jobIds.length === 0) {
        return res.status(404).json({ error: "No matching jobs found" });
      }

      await prisma.$transaction([
        prisma.jobLog.deleteMany({ where: { jobId: { in: jobIds } } }),
        prisma.jobReminder.deleteMany({ where: { jobId: { in: jobIds } } }),
        prisma.jobCallSession.deleteMany({ where: { jobId: { in: jobIds } } }),
        prisma.jobRecord.deleteMany({ where: { jobId: { in: jobIds } } }),
        prisma.jobClosing.deleteMany({ where: { jobId: { in: jobIds } } }),
        prisma.job.deleteMany({ where: { id: { in: jobIds } } }),
      ]);

      return res.json({ success: true, deleted: jobIds.length });
    } catch (err) {
      console.error("❌ BULK DELETE JOBS ERROR:", err);
      return res.status(500).json({ error: "Failed to delete jobs" });
    }
  }
}