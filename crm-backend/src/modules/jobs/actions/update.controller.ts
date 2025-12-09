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

    // -----------------------------------------------
    // 🛑 Detect CANCELED status
    // -----------------------------------------------
    let isCanceled = false;

    // If frontend sends NAME
    if (typeof updates.status === "string") {
      const clean = updates.status.toLowerCase();
      isCanceled = ["canceled", "cancelled", "cancel"].includes(clean);
    }

    // If frontend sends ID
    if (!isCanceled && updates.statusId) {
      const statusRow = await prisma.jobStatus.findUnique({
        where: { id: updates.statusId },
      });

      if (statusRow) {
        const clean = statusRow.name.toLowerCase();
        isCanceled = ["canceled", "cancelled", "cancel"].includes(clean);
      }
    }

    // -----------------------------------------------
    // 📝 Extract cancel reason from frontend
    // -----------------------------------------------
    const canceledReason = updates.statusNote || null;

    // -----------------------------------------------
    // MAIN JOB UPDATE
    // -----------------------------------------------
    const updatedJob = await prisma.job.update({
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

        // ⭐ Save cancellation info directly on JOB
        ...(isCanceled
          ? {
              canceledReason,
              canceledAt: new Date(),
              isClosingLocked: false, // unlock UI
            }
          : {}),

        // ⭐ Allow manual editing of closedAt (admin or UI Save Changes)
        ...(updates.closedAt
          ? {
              closedAt: new Date(updates.closedAt),
              // Keep status locked only if job already closed
              isClosingLocked: true,
            }
          : {}),
      },
      include: {
        technician: true,
        jobType: true,
        source: true,
        jobStatus: true,
      },
    });

    return res.json({ message: "Job updated", job: updatedJob });
  } catch (err) {
    console.error("updateJobByShortId error:", err);
    return res.status(500).json({ error: "Failed to update job" });
  }
}