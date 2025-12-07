// crm-backend/src/modules/jobs/actions/duplicate.controller.ts
import { Request, Response } from "express";
import prisma from "../../../prisma/client";

export async function duplicateJob(req: Request, res: Response) {
  try {
    const { shortId } = req.params;

    // Load the original job
    const original = await prisma.job.findFirst({
      where: {
        shortId: shortId.toUpperCase(),
        companyId: req.user!.companyId,
      },
      include: {
        jobType: true,
        technician: true,
        source: true,
      },
    });

    if (!original)
      return res.status(404).json({ error: "Original job not found" });

    // Generate new short ID
    const newShortId = Math.random().toString(36).substring(2, 7).toUpperCase();

    // Create duplicated job
    const newJob = await prisma.job.create({
      data: {
        shortId: newShortId,
        title: original.title,
        description: original.description,
        customerName: original.customerName,
        customerPhone: original.customerPhone,
        customerPhone2: original.customerPhone2,
        customerAddress: original.customerAddress,
        jobTypeId: original.jobTypeId,
        technicianId: original.technicianId,
        sourceId: original.sourceId,
        status: "Accepted",
        statusId: null,
        scheduledAt: original.scheduledAt,
        companyId: original.companyId,
      },
    });

    res.json({ message: "Job duplicated", job: newJob });
  } catch (err) {
    console.error("🔥 DUPLICATE JOB ERROR:", err);
    res.status(500).json({ error: "Failed to duplicate job" });
  }
}