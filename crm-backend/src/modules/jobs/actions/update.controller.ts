import { Request, Response } from "express";
import prisma from "../../../prisma/client";
import { logJobEvent } from "../../../utils/jobLogger";
import { isTerminalCallStatus } from "../../../constants/jobStatus";
import { techPerms } from "../../../utils/scope";


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

    // Restricted technicians can't change locked fields — force any such
    // change back to the current value (frontend already hides/disables these).
    const perms = await techPerms(req);
    if (perms) {
      // Technician-only locks
      updates.description = job.description; // description is view-only for techs
      if (!perms.canChangeJobType) updates.jobTypeId = job.jobTypeId;
      if (!perms.canSeeLeadSource) updates.sourceId = job.sourceId;
      if (!perms.canSeeTechnicianField) updates.technicianId = job.technicianId;
      if (!perms.canEditCustomerName) updates.customerName = job.customerName;
      if (!perms.canEditCustomerAddress)
        updates.customerAddress = job.customerAddress;
      // Phone-blind techs can't change the number they can't see.
      if (!perms.canSeeClientPhone) {
        updates.customerPhone = job.customerPhone;
        updates.customerPhone2 = job.customerPhone2;
      }
    }

    /* ======================================================
       STATUS DETECTION
    ====================================================== */
    let isCanceled = false;
    let isPendingCancel = false;
    let isClosed = false;
    // Whether the new status ends the job for call-routing purposes
    // (Closed / Canceled / Pending Close / Pending Cancel).
    let isTerminal = false;

    if (typeof updates.status === "string") {
      const clean = updates.status.toLowerCase();
      isCanceled = ["cancel", "canceled", "cancelled"].includes(clean);
      isPendingCancel = clean === "pending cancel";
      isClosed = clean === "closed";
      isTerminal = isTerminalCallStatus(updates.status);
    }

    if (updates.statusId) {
      const statusRow = await prisma.jobStatus.findUnique({
        where: { id: updates.statusId },
      });

      if (statusRow) {
        const clean = statusRow.name.toLowerCase();
        isCanceled = ["cancel", "canceled", "cancelled"].includes(clean);
        isPendingCancel = clean === "pending cancel";
        isClosed = clean === "closed";
        isTerminal = isTerminalCallStatus(statusRow.name);
      }
    }

    // Technicians/dispatchers finalize nothing: a request to set Closed /
    // Canceled is downgraded to its pending equivalent, so the job stays
    // editable until an admin finalizes it. The UI already hides these
    // options — this catches stale clients and crafted requests.
    if (perms && (isClosed || isCanceled)) {
      const pendingName = isClosed ? "Pending Close" : "Pending Cancel";
      const pendingStatus = await prisma.jobStatus.findFirst({
        where: { name: pendingName, active: true },
      });

      if (pendingStatus) {
        updates.statusId = pendingStatus.id;
        updates.status = pendingName;
        // Never stamp/lock on a downgraded status.
        updates.closedAt = null;
        isPendingCancel = isCanceled;
        isCanceled = false;
        isClosed = false;
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

...(isCanceled || isPendingCancel
  ? {
      // Save the reason for BOTH pending cancel and final cancel.
      canceledReason,
      // Only a FINAL cancel stamps canceledAt (which drives the 45-min board
      // hide); a pending cancel stays unstamped so it never disappears.
      canceledAt: isCanceled
        ? updates.canceledAt
          ? new Date(updates.canceledAt)
          : job.canceledAt ?? new Date()
        : null,
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

    // A terminal status (Closed/Canceled/Pending Close/Pending Cancel) ends the
    // job — terminate its active call sessions and free the extension.
    if (isTerminal) {
      await prisma.jobCallSession.updateMany({
        where: { jobId: job.id, active: true },
        data: { active: false, lastCallerPhone: null },
      });
    }

/* ======================================================
   📝 LOG EVENTS
====================================================== */
function normalizeText(v?: string | null) {
  return (v || "").trim();
}

// 📍 ADDRESS CHANGED
const oldAddress = normalizeText(job.customerAddress);
const newAddress = normalizeText(updatedJob.customerAddress);

if (oldAddress !== newAddress) {
  await logJobEvent({
    jobId: job.id,
    type: "updated",
    text: `📍 Address changed
Old: ${oldAddress || "—"}
New: ${newAddress || "—"}`,
    userId: req.user!.id,
  });
}

// 📞 PHONE 1 CHANGED
const oldPhone1 = normalizeText(job.customerPhone);
const newPhone1 = normalizeText(updatedJob.customerPhone);

if (oldPhone1 !== newPhone1) {
  await logJobEvent({
    jobId: job.id,
    type: "updated",
    text: `📞 Phone 1 changed
Old: ${oldPhone1 || "—"}
New: ${newPhone1 || "—"}`,
    userId: req.user!.id,
  });
}

// 📞 PHONE 2 CHANGED
const oldPhone2 = normalizeText(job.customerPhone2);
const newPhone2 = normalizeText(updatedJob.customerPhone2);

if (oldPhone2 !== newPhone2) {
  await logJobEvent({
    jobId: job.id,
    type: "updated",
    text: `📞 Phone 2 changed
Old: ${oldPhone2 || "—"}
New: ${newPhone2 || "—"}`,
    userId: req.user!.id,
  });
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

// 📅 APPOINTMENT CHANGED / CLEARED (WITH TIME)
if (
  updates.scheduledAt !== undefined &&
  String(updates.scheduledAt) !== String(job.scheduledAt)
) {
  const oldTime = job.scheduledAt
    ? new Date(job.scheduledAt).toLocaleString("en-US", {
        timeZone: job.timezone || "UTC",
      })
    : null;

  const newTime = updates.scheduledAt
    ? new Date(updates.scheduledAt).toLocaleString("en-US", {
        timeZone: job.timezone || "UTC",
      })
    : null;

  await logJobEvent({
    jobId: job.id,
    type: "scheduled",
    text: updates.scheduledAt
      ? `📅 Appointment updated
Old: ${oldTime || "—"}
New: ${newTime}`
      : `📅 Appointment cleared
Old: ${oldTime || "—"}`,
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
   ⏰ REMINDERS
   Replace the pending (un-sent) reminder set each save.
   Already-sent reminders are kept as history (they won't re-fire).
   This prevents canceled rows from piling up.
====================================================== */
    const remindersInvalid =
      appointmentCleared || isCanceled || isClosed || techRemoved;

    if (remindersInvalid) {
      // Job is no longer valid for reminders → drop pending ones
      await prisma.jobReminder.deleteMany({
        where: { jobId: job.id, sentAt: null },
      });
    } else if (Array.isArray(updates.reminders) && updatedJob.scheduledAt) {
      const appointmentTime = new Date(updatedJob.scheduledAt);

      // Wipe pending reminders, then recreate from the current set
      await prisma.jobReminder.deleteMany({
        where: { jobId: job.id, sentAt: null },
      });

      for (const r of updates.reminders) {
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