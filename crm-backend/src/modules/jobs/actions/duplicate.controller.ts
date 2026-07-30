// crm-backend/src/modules/jobs/actions/duplicate.controller.ts
import { Request, Response } from "express";
import prisma from "../../../prisma/client";
import { logJobEvent } from "../../../utils/jobLogger";

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

    // 🎯 Resolve Accepted status so the duplicate lands correctly on the board
    const acceptedStatus = await prisma.jobStatus.findFirst({
      where: { name: "Accepted", active: true },
    });

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
        timezone: original.timezone,
        jobTypeId: original.jobTypeId,
        technicianId: original.technicianId,
        sourceId: original.sourceId,
        status: "Accepted",
        statusId: acceptedStatus?.id ?? null,
        scheduledAt: original.scheduledAt,
        companyId: original.companyId,
      },
    });

    // 📝 Log creation on the NEW job (original job stays untouched)
    // Box 1 — header: where this job came from
    await logJobEvent({
      jobId: newJob.id,
      type: "duplicated",
      text: `Job created from duplicate of job ${original.shortId}`,
      userId: req.user?.id,
    });

    // Box 2 — details copied from the source job
    const detailsLines = [
      original.source?.name || "",
      "",
      `Name: ${original.customerName || "-"}`,
      `Address: ${original.customerAddress || "-"}`,
      `Phone: ${original.customerPhone || "-"}`,
      `Type: ${original.jobType?.name || "-"}`,
      `Description: ${original.description || "-"}`,
    ];
    await logJobEvent({
      jobId: newJob.id,
      type: "duplicated",
      text: detailsLines.join("\n"),
      userId: req.user?.id,
    });

    res.json({ message: "Job duplicated", job: newJob });
  } catch (err) {
    console.error("🔥 DUPLICATE JOB ERROR:", err);
    res.status(500).json({ error: "Failed to duplicate job" });
  }
}