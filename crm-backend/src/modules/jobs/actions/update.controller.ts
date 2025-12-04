import { Request, Response } from "express";
import prisma from "../../../prisma/client";

export async function updateJobByShortId(req: Request, res: Response) {
  try {
    const shortId = req.params.shortId.toUpperCase();
    const updates = req.body;

    const job = await prisma.job.findFirst({
      where: { shortId, companyId: req.user!.companyId },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });

    // ------------------------------------------------------
    // 🛑 Detect if new status means CANCELED
    // ------------------------------------------------------
    let isCanceled = false;

    // If frontend sent name
    if (typeof updates.status === "string") {
      const clean = updates.status.toLowerCase();
      isCanceled = ["canceled", "cancelled", "cancel"].includes(clean);
    }

    // If frontend sent ID
    if (!isCanceled && updates.statusId) {
      const statusRow = await prisma.jobStatus.findUnique({
        where: { id: updates.statusId },
      });

      if (statusRow) {
        const clean = statusRow.name.toLowerCase();
        isCanceled = ["canceled", "cancelled", "cancel"].includes(clean);
      }
    }

    // ------------------------------------------------------
    // UPDATE JOB
    // ------------------------------------------------------
    const updated = await prisma.job.update({
      where: { id: job.id },
      data: {
        title: updates.title ?? job.title,
        description: updates.description ?? job.description,

        technicianId:
          updates.technicianId !== undefined
            ? updates.technicianId || null
            : job.technicianId,

        scheduledAt:
          updates.scheduledAt !== undefined
            ? updates.scheduledAt
              ? new Date(updates.scheduledAt)
              : null
            : job.scheduledAt,

        status: updates.status ?? job.status,

        jobTypeId:
          updates.jobTypeId !== undefined
            ? updates.jobTypeId || null
            : job.jobTypeId,

        customerName: updates.customerName ?? job.customerName,

        customerPhone: updates.customerPhone ?? job.customerPhone,

        customerPhone2:
          updates.customerPhone2 !== undefined
            ? updates.customerPhone2 || null
            : job.customerPhone2,

        customerAddress: updates.customerAddress ?? job.customerAddress,

        sourceId:
          updates.sourceId !== undefined
            ? updates.sourceId || null
            : job.sourceId,

        statusId:
          updates.statusId !== undefined
            ? updates.statusId || null
            : job.statusId,

        // When canceling → unlock closing UI
        ...(isCanceled ? { isClosingLocked: false } : {}),
      },
      include: {
        technician: true,
        jobType: true,
        source: true,
        jobStatus: true,
      },
    });

    // ------------------------------------------------------
    // 🧹 DELETE CLOSING IF JOB IS CANCELED
    // ------------------------------------------------------
    if (isCanceled) {
      await prisma.jobClosing
        .deleteMany({ where: { jobId: job.id } })
        .catch(() => {});
    }

    return res.json({ message: "Job updated", job: updated });
  } catch (err) {
    console.error("updateJobByShortId error:", err);
    return res.status(500).json({ error: "Failed to update job" });
  }
}