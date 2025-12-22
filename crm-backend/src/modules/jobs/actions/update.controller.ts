import { Request, Response } from "express";
import prisma from "../../../prisma/client";

export async function updateJobByShortId(req: Request, res: Response) {
  try {
    const shortId = req.params.shortId.toUpperCase();
    const updates = req.body;
console.log("🔵 UPDATE JOB PAYLOAD:", {
  shortId,
  scheduledAt: updates.scheduledAt,
  reminders: updates.reminders,
  });
    const job = await prisma.job.findFirst({
      where: { shortId, companyId: req.user!.companyId },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    /* ======================================================
       STATUS DETECTION
    ====================================================== */
    let isCanceled = false;
    let isClosed = false;

    if (typeof updates.status === "string") {
      const clean = updates.status.toLowerCase();
      isCanceled = ["cancel", "canceled", "cancelled"].includes(clean);
      isClosed = clean === "closed";
    }

    if (updates.statusId) {
      const statusRow = await prisma.jobStatus.findUnique({
        where: { id: updates.statusId },
      });

      if (statusRow) {
        const clean = statusRow.name.toLowerCase();
        isCanceled = ["cancel", "canceled", "cancelled"].includes(clean);
        isClosed = clean === "closed";
      }
    }

    const canceledReason = updates.statusNote || null;

    /* ======================================================
       STATE INVALIDATION CHECKS
    ====================================================== */
    const appointmentCleared =
  updates.scheduledAt !== undefined &&
  (updates.scheduledAt === null || updates.scheduledAt === "");
    const techRemoved =
      updates.technicianId !== undefined &&
      updates.technicianId !== job.technicianId &&
      !updates.technicianId;
console.log("🟡 INVALIDATION FLAGS:", {
  appointmentCleared,
  isCanceled,
  isClosed,
  techRemoved,
});
    /* ======================================================
       MAIN JOB UPDATE
    ====================================================== */
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

        timezone:
          updates.timezone !== undefined
          ? updates.timezone || null
          : job.timezone,

        sourceId:
          updates.sourceId !== undefined
            ? updates.sourceId || null
            : job.sourceId,

        status: updates.status ?? job.status,
        statusId:
          updates.statusId !== undefined
            ? updates.statusId || null
            : job.statusId,

...(isCanceled
  ? {
      canceledReason,
      canceledAt: updates.canceledAt
        ? new Date(updates.canceledAt)
        : job.canceledAt ?? new Date(),
    }
  : {
      canceledAt: null,
    }),

        ...(isClosed || updates.closedAt
          ? {
              closedAt: updates.closedAt
                ? new Date(updates.closedAt)
                : new Date(),
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

    /* ======================================================
       🧹 CANCEL REMINDERS WHEN INVALID
    ====================================================== */
    if (appointmentCleared || isCanceled || isClosed || techRemoved) {
  console.log("🧹 REMINDERS INVALIDATED — CANCELING", { jobId: job.id });

  await prisma.jobReminder.updateMany({
    where: { jobId: job.id, canceled: false },
    data: { canceled: true, sendToTechnician: false },
  });
}

    /* ======================================================
       ⏰ PERSIST REMINDERS
       (ONLY if checkbox was checked)
    ====================================================== */
    if (Array.isArray(updates.reminders) && updatedJob.scheduledAt) {
  const appointmentTime = new Date(updatedJob.scheduledAt);

  console.log("🟢 PERSIST REMINDERS START", {
    reminders: updates.reminders,
    scheduledAt: updatedJob.scheduledAt,
  });

  // 🔁 CANCEL EXISTING REMINDERS FIRST (CRITICAL)
  await prisma.jobReminder.updateMany({
    where: { jobId: job.id },
    data: { canceled: true, sendToTechnician: false },
  });

  for (const r of updates.reminders) {
    console.log("🟣 PROCESSING REMINDER:", r);

    if (
      r.canceled === true ||
      typeof r.minutesBefore !== "number" ||
      r.minutesBefore <= 0
    ) {
      continue;
    }

    const scheduledFor = new Date(
      appointmentTime.getTime() - r.minutesBefore * 60 * 1000
    );

    console.log("🟢 INSERTING REMINDER:", {
      jobId: job.id,
      minutesBefore: r.minutesBefore,
      scheduledFor,
    });

    await prisma.jobReminder.create({
      data: {
        jobId: job.id,
        minutesBefore: r.minutesBefore,
        scheduledFor,
        canceled: false,
        sendToTechnician: true,
      },
    });
  }
}

    return res.json({ message: "Job updated", job: updatedJob });
  } catch (err) {
    console.error("updateJobByShortId error:", err);
    return res.status(500).json({ error: "Failed to update job" });
  }
}