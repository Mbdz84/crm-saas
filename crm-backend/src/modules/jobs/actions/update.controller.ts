import { Request, Response } from "express";
import prisma from "../../../prisma/client";
import { logJobEvent } from "../../../utils/jobLogger";


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
   📝 LOG EVENTS
====================================================== */
function normalizeText(v?: string | null) {
  return (v || "").trim();
}
// 📝 DESCRIPTION / NOTES CHANGED
const oldDesc = normalizeText(job.description);
const newDesc = normalizeText(updatedJob.description);

if (oldDesc !== newDesc) {
  await logJobEvent({
    jobId: job.id,
    type: "updated",
    text: newDesc
      ? `Notes updated:\n— Before: "${oldDesc || "empty"}"\n→ After: "${newDesc}"`
      : `Notes cleared (was: "${oldDesc}")`,
    userId: req.user!.id,
  });
}

// 🔴 CANCELED (log once)
if (isCanceled && !job.canceledAt) {
  await logJobEvent({
    jobId: job.id,
    type: "canceled",
    text: canceledReason
      ? `Job canceled: ${canceledReason}`
      : "Job canceled",
    userId: req.user!.id,
  });
}

// 🔵 STATUS CHANGED (explicit, non-cancel, non-close)
if (
  updates.statusId &&
  updatedJob.statusId !== job.statusId &&
  !isCanceled &&
  !isClosed &&
  job.statusId // ✅ GUARARD AGAINST NULL
) {
  const [oldStatus, newStatus] = await Promise.all([
    prisma.jobStatus.findUnique({
      where: { id: job.statusId! }, // 👈 non-null assertion
    }),
    prisma.jobStatus.findUnique({
      where: { id: updatedJob.statusId! },
    }),
  ]);

  if (oldStatus?.name !== newStatus?.name) {
    await logJobEvent({
      jobId: job.id,
      type: "status_changed",
      text: `Status changed from ${oldStatus?.name ?? "Unknown"} → ${newStatus?.name ?? "Unknown"}`,
      userId: req.user!.id,
    });
  }
}

// 🌎 TIMEZONE CHANGED
if (
  updates.timezone !== undefined &&
  String(updates.timezone || "") !== String(job.timezone || "")
) {
  await logJobEvent({
    jobId: job.id,
    type: "timezone_changed",
    text: `Timezone changed from ${job.timezone || "unset"} → ${updates.timezone || "unset"}`,
    userId: req.user!.id,
  });
}

// 📅 APPOINTMENT CHANGED / CLEARED
if (
  updates.scheduledAt !== undefined &&
  updates.scheduledAt !== job.scheduledAt
) {
  await logJobEvent({
    jobId: job.id,
    type: "scheduled",
    text: updates.scheduledAt
      ? "Appointment scheduled/updated"
      : "Appointment cleared",
    userId: req.user!.id,
  });
}
// 👨‍🔧 TECHNICIAN CHANGED
if (
  updates.technicianId !== undefined &&
  updatedJob.technicianId !== job.technicianId
) {
  const oldTech = job.technicianId
    ? await prisma.user.findUnique({
        where: { id: job.technicianId },
        select: { name: true },
      })
    : null;

  const newTech = updatedJob.technicianId
    ? await prisma.user.findUnique({
        where: { id: updatedJob.technicianId },
        select: { name: true },
      })
    : null;

  await logJobEvent({
    jobId: job.id,
    type: "assigned_technician",
    text: `Technician changed from ${oldTech?.name || "Unassigned"} → ${newTech?.name || "Unassigned"}`,
    userId: req.user!.id,
  });
}


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