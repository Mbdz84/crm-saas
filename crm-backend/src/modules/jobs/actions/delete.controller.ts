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
}