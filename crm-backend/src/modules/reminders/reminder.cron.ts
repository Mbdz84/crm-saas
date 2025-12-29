import prisma from "../../prisma/client";
import { sendTechSms } from "../jobs/actions/sms.controller";

let running = false;

/**
 * Runs every 10 minutes
 * - Finds due reminders
 * - Sends SMS
 * - Marks them as sent
 */
export async function processJobReminders() {
  if (running) {
    console.log("⏭️ REMINDER CRON SKIPPED (still running)");
    return;
  }

  running = true;
  const now = new Date();

  console.log("⏰ REMINDER CRON RUN @", now.toISOString());

  try {
    const reminders = await prisma.jobReminder.findMany({
      where: {
        canceled: false,
        sentAt: null,
        scheduledFor: { lte: now },
      },
      include: {
        job: {
          include: {
            technician: true,
            jobType: true,
            source: true,
          },
        },
      },
    });

    console.log(`📨 FOUND ${reminders.length} DUE REMINDERS`);

    for (const r of reminders) {
      const job = r.job;

      try {
        // 🔒 Safety checks
        if (!job) {
          console.warn("⚠️ Reminder has no job", r.id);
          continue;
        }

        if (!job.technicianId) {
          console.warn("⚠️ No technician, skipping reminder", r.id);
          continue;
        }

        if (job.canceledAt || job.closedAt) {
          console.warn("⚠️ Job canceled/closed, skipping", r.id);
          continue;
        }

        console.log("📤 SENDING REMINDER SMS", {
          reminderId: r.id,
          jobId: job.id,
          techId: job.technicianId,
        });

        // 🔔 SEND SMS
        await sendTechSms(job.technicianId, job);

        // ✅ Mark as sent
        await prisma.jobReminder.update({
          where: { id: r.id },
          data: { sentAt: new Date() },
        });

        console.log("✅ REMINDER SENT", r.id);
      } catch (err) {
        console.error("❌ REMINDER FAILED", r.id, err);
      }
    }
  } catch (err) {
    console.error("🔥 REMINDER CRON ERROR", err);
  } finally {
    running = false;
  }
}