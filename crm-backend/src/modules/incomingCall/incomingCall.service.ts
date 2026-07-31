import prisma from "../../prisma/client";

/* ============================================================
   INCOMING-CALL LOG — service helpers
   Attaches inbound dispatch-call recordings to jobs by phone +
   time. Everything here is FAIL-SAFE: it must never break job
   creation or the webhook. See docs/incoming-call-log.md
============================================================ */

const WINDOW_MS = 24 * 60 * 60 * 1000; // ±24h match window

// Feature flag: enabled unless INCOMING_CALL_LOG === "off"
export function callLogEnabled(): boolean {
  return process.env.INCOMING_CALL_LOG !== "off";
}

// Last 10 digits — format-proof phone matching (same idea as job search).
export function last10(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}

// Write one incoming_call JobLog for a call, unless it's already there.
async function writeCallLog(jobId: string, call: any) {
  try {
    const existing = await prisma.jobLog.findFirst({
      where: {
        jobId,
        type: "incoming_call",
        text: { contains: call.callSid },
      },
    });
    if (existing) return;

    await prisma.jobLog.create({
      data: {
        jobId,
        type: "incoming_call",
        text: JSON.stringify({
          callSid: call.callSid,
          from: call.fromNumber,
          leadSource: call.leadSourceName || null,
          duration: call.duration ?? null,
          recordingUrl: call.recordingUrl || null,
          occurredAt: call.occurredAt,
        }),
      },
    });
  } catch (err) {
    console.error("⚠️ writeCallLog failed:", err);
  }
}

// Jobs for this company whose customer phone matches, created within the
// ±24h window around a reference time.
async function matchingJobs(companyId: string, phone10: string, ref: Date) {
  const since = new Date(ref.getTime() - WINDOW_MS);
  const until = new Date(ref.getTime() + WINDOW_MS);

  const jobs = await prisma.job.findMany({
    where: { companyId, createdAt: { gte: since, lte: until } },
    select: {
      id: true,
      customerPhone: true,
      customerPhone2: true,
    },
  });

  return jobs.filter(
    (j) => last10(j.customerPhone) === phone10 || last10(j.customerPhone2) === phone10
  );
}

// CALL-FIRST path: a call just arrived — attach it to any matching jobs
// that already exist.
export async function attachCallToExistingJobs(call: any) {
  if (!callLogEnabled()) return;
  try {
    const from10 = last10(call.fromNumber);
    if (!from10) return;

    const jobs = await matchingJobs(call.companyId, from10, call.occurredAt);
    if (jobs.length === 0) return;

    for (const job of jobs) await writeCallLog(job.id, call);

    if (!call.attached) {
      await prisma.inboundCall.update({
        where: { id: call.id },
        data: { attached: true },
      });
    }
  } catch (err) {
    console.error("⚠️ attachCallToExistingJobs failed:", err);
  }
}

// JOB-FIRST path: a job was just created — attach any pending calls from the
// same number within the window. Call this after job creation. FAIL-SAFE.
export async function attachPendingCallsToJob(job: {
  id: string;
  companyId: string;
  customerPhone?: string | null;
  customerPhone2?: string | null;
  createdAt: Date;
}) {
  if (!callLogEnabled()) return;
  try {
    const phone10 = last10(job.customerPhone) || last10(job.customerPhone2);
    if (!phone10) return;

    const since = new Date(job.createdAt.getTime() - WINDOW_MS);
    const until = new Date(job.createdAt.getTime() + WINDOW_MS);

    const calls = await prisma.inboundCall.findMany({
      where: { companyId: job.companyId, occurredAt: { gte: since, lte: until } },
    });

    for (const call of calls) {
      if (last10(call.fromNumber) !== phone10) continue;
      await writeCallLog(job.id, call);
      if (!call.attached) {
        await prisma.inboundCall.update({
          where: { id: call.id },
          data: { attached: true },
        });
      }
    }
  } catch (err) {
    console.error("⚠️ attachPendingCallsToJob failed:", err);
  }
}

// Cleanup: drop pending (never-attached) calls older than 24h — spam / calls
// that never became a job.
export async function cleanupPendingCalls() {
  if (!callLogEnabled()) return;
  try {
    const cutoff = new Date(Date.now() - WINDOW_MS);
    await prisma.inboundCall.deleteMany({
      where: { attached: false, createdAt: { lt: cutoff } },
    });
  } catch (err) {
    console.error("⚠️ cleanupPendingCalls failed:", err);
  }
}
