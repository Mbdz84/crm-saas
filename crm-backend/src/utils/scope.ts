import prisma from "../prisma/client";

/* ============================================================
   Per-request permission scoping for technicians.
   Flags are read once and memoized on the request object so
   multiple helpers in one request don't re-query.
============================================================ */

type TechFlags = {
  canViewAllJobs: boolean;
  canSeeClientPhone: boolean;
  canSeeLogs: boolean;
  canSeeRecordings: boolean;
  canSeeReports: boolean;
  canUseCalendar: boolean;
} | null;

async function techFlags(req: any): Promise<TechFlags> {
  if (req?.user?.role !== "technician") return null;
  if (req._techFlags !== undefined) return req._techFlags;

  const u = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      canViewAllJobs: true,
      canSeeClientPhone: true,
      canSeeLogs: true,
      canSeeRecordings: true,
      canSeeReports: true,
      canUseCalendar: true,
    },
  });

  req._techFlags =
    u ?? {
      canViewAllJobs: false,
      canSeeClientPhone: true,
      canSeeLogs: true,
      canSeeRecordings: true,
      canSeeReports: true,
      canUseCalendar: true,
    };
  return req._techFlags;
}

/** True when this technician must be blocked from the calendar. */
export async function calendarBlocked(req: any): Promise<boolean> {
  const f = await techFlags(req);
  return !!f && f.canUseCalendar === false;
}

/** True when this technician must be blocked from reports entirely. */
export async function reportsBlocked(req: any): Promise<boolean> {
  const f = await techFlags(req);
  return !!f && f.canSeeReports === false;
}

/**
 * True when report data must be limited to this technician's own numbers
 * (a restricted technician — hide lead/company profit & balances).
 */
export async function limitReportToTech(req: any): Promise<boolean> {
  const f = await techFlags(req);
  return !!f && f.canViewAllJobs === false;
}

/** Null out lead/company profit, balance and percentage on a job's closing. */
export function stripJobSecrets(job: any) {
  const c = job?.closing;
  if (!c) return job;
  c.leadProfit = null;
  c.companyProfitDisplay = null;
  c.companyProfitBase = null;
  c.leadBalance = null;
  c.companyBalance = null;
  c.leadPercent = null;
  c.companyPercent = null;
  c.companyParts = null;
  return job;
}

/**
 * Permission summary for the current viewer, attached to a job payload so the
 * frontend can hide tabs. Non-technicians get full access.
 */
export async function jobViewer(req: any): Promise<{
  role: string | null;
  canSeeLogs: boolean;
  canSeeRecordings: boolean;
}> {
  const f = await techFlags(req);
  if (!f) {
    return {
      role: req?.user?.role ?? null,
      canSeeLogs: true,
      canSeeRecordings: true,
    };
  }
  return {
    role: "technician",
    canSeeLogs: f.canSeeLogs,
    canSeeRecordings: f.canSeeRecordings,
  };
}

/**
 * Own-jobs scoping. Returns a Prisma `where` fragment to merge:
 *   { technicianId: <id> } (restricted)  or  {} (unrestricted).
 */
export async function ownJobsWhere(req: any): Promise<Record<string, any>> {
  const f = await techFlags(req);
  if (!f) return {};
  return f.canViewAllJobs ? {} : { technicianId: req.user.id };
}

/**
 * True when the real client phone must be hidden from this user
 * (technician with "see client phone" off).
 */
export async function hideClientPhone(req: any): Promise<boolean> {
  const f = await techFlags(req);
  if (!f) return false;
  return f.canSeeClientPhone === false;
}

/**
 * Null out the real customer phone(s) on a job payload (and the phone stored
 * on its call sessions) — the masked number + extension stay visible.
 */
export function maskJobPhone(job: any) {
  if (!job) return job;
  job.customerPhone = null;
  job.customerPhone2 = null;
  if (Array.isArray(job.callSessions)) {
    for (const s of job.callSessions) s.customerPhone = null;
  }
  return job;
}
