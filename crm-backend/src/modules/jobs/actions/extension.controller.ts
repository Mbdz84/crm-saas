import { Request, Response } from "express";
import prisma from "../../../prisma/client";

export async function refreshExtension(req: Request, res: Response) {
  try {
    const shortId = req.params.shortId.toUpperCase();

    const job = await prisma.job.findFirst({
      where: { shortId, companyId: req.user!.companyId }
    });

    if (!job) return res.status(404).json({ error: "Job not found" });
    if (!job.technicianId)
      return res.status(400).json({ error: "No technician assigned" });

    const newExt = Math.floor(100 + Math.random() * 9000).toString();

    const existing = await prisma.jobCallSession.findFirst({
      where: { jobId: job.id, technicianId: job.technicianId }
    });

    const updated = existing
      ? await prisma.jobCallSession.update({
          where: { id: existing.id },
          data: { extension: newExt }
        })
      : await prisma.jobCallSession.create({
          data: {
            jobId: job.id,
            technicianId: job.technicianId,
            customerPhone: job.customerPhone || "",
            extension: newExt,
            companyId: job.companyId
          }
        });

    return res.json({
      message: "Extension refreshed",
      extension: newExt,
      sessionId: updated.id
    });
  } catch (err) {
    console.error("refreshExtension error:", err);
    return res.status(500).json({ error: "Failed to refresh extension" });
  }
}