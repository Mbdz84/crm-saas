import prisma from "../prisma/client";

/* ============================================================
   Per-request permission scoping for technicians.
   Flags are read once and memoized on the request object so
   multiple helpers in one request don't re-query.
============================================================ */

type TechFlags = {
  canViewAllJobs: boolean;
  canSeeClientPhone: boolean;
  canSeeClosing: boolean;
  canSeeLogs: boolean;
  canSeeRecordings: boolean;
  canSeeReports: boolean;
  canUseCalendar: boolean;
  canSeeLeadSource: boolean;
  canSeeTechnicianField: boolean;
  canChangeJobType: boolean;
  canEditCustomerName: boolean;
  canEditCustomerAddress: boolean;
  canEditDescription: boolean;
  canEditStatus: boolean;
  canSeeCallerId: boolean;
  canAdjustPercentages: boolean;
  canAdjustFees: boolean;
  canRefreshExtension: boolean;
  canDeleteJob: boolean;
  canDuplicateJob: boolean;
  canSeeDashboard: boolean;
  canUseChat: boolean;
  canSeeSearch: boolean;
} | null;

const TECH_DEFAULTS = {
  canViewAllJobs: false,
  canSeeClientPhone: true,
  canSeeClosing: true,
  canSeeLogs: true,
  canSeeRecordings: true,
  canSeeReports: true,
  canUseCalendar: true,
  canSeeLeadSource: true,
  canSeeTechnicianField: true,
  canChangeJobType: true,
  canEditCustomerName: true,
  canEditCustomerAddress: true,
  canEditDescription: true,
  canEditStatus: true,
  canSeeCallerId: true,
  canAdjustPercentages: false,
  canAdjustFees: false,
  canRefreshExtension: true,
  canDeleteJob: true,
  canDuplicateJob: true,
  canSeeDashboard: true,
  canUseChat: true,
  canSeeSearch: true,
};

async function techFlags(req: any): Promise<TechFlags> {
  // Technicians AND dispatchers are subject to the permission flags.
  if (req?.user?.role !== "technician" && req?.user?.role !== "dispatcher")
    return null;
  if (req._techFlags !== undefined) return req._techFlags;

  const u = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      canViewAllJobs: true,
      canSeeClientPhone: true,
      canSeeClosing: true,
      canSeeLogs: true,
      canSeeRecordings: true,
      canSeeReports: true,
      canUseCalendar: true,
      canSeeLeadSource: true,
      canSeeTechnicianField: true,
      canChangeJobType: true,
      canEditCustomerName: true,
      canEditCustomerAddress: true,
      canEditDescription: true,
      canEditStatus: true,
      canSeeCallerId: true,
      canAdjustPercentages: true,
      canAdjustFees: true,
      canRefreshExtension: true,
      canDeleteJob: true,
      canDuplicateJob: true,
      canSeeDashboard: true,
      canUseChat: true,
      canSeeSearch: true,
    },
  });

  req._techFlags = u ?? { ...TECH_DEFAULTS };
  return req._techFlags;
}

/** True when this technician must be blocked from the calendar. */
export async function calendarBlocked(req: any): Promise<boolean> {
  const f = await techFlags(req);
  return !!f && f.canUseCalendar === false;
}

/**
 * The current user's technician permission flags, or null for non-technicians
 * (admins/owners — full access). Used to guard write actions server-side.
 */
export async function techPerms(req: any): Promise<TechFlags> {
  return techFlags(req);
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

/**
 * Hide lead/company figures AND the lead source itself from a report job
 * (used for restricted technicians).
 */
export function stripJobSecrets(job: any) {
  if (!job) return job;
  // Lead source name/id — a tech shouldn't see which source a job came from.
  job.source = null;
  job.sourceId = null;
  const c = job.closing;
  if (c) {
    c.leadProfit = null;
    c.companyProfitDisplay = null;
    c.companyProfitBase = null;
    c.leadBalance = null;
    c.companyBalance = null;
    c.leadPercent = null;
    c.companyPercent = null;
    c.companyParts = null;
  }
  return job;
}

/**
 * Permission summary for the current viewer, attached to a job payload so the
 * frontend can hide tabs. Non-technicians get full access.
 */
export async function jobViewer(req: any): Promise<Record<string, any>> {
  const f = await techFlags(req);
  if (!f) {
    // Non-technicians (admin/owner) — full access.
    return {
      role: req?.user?.role ?? null,
      canSeeLogs: true,
      canSeeRecordings: true,
      canSeeClientPhone: true,
      canSeeClosing: true,
      canSeeLeadSource: true,
      canSeeTechnicianField: true,
      canChangeJobType: true,
      canEditCustomerName: true,
      canEditCustomerAddress: true,
      canEditDescription: true,
      canEditStatus: true,
      canSeeCallerId: true,
      canAdjustPercentages: true,
      canAdjustFees: true,
      canRefreshExtension: true,
      canDeleteJob: true,
      canDuplicateJob: true,
    };
  }
  return {
    role: "technician",
    canSeeLogs: f.canSeeLogs,
    canSeeRecordings: f.canSeeRecordings,
    canSeeClientPhone: f.canSeeClientPhone,
    canSeeClosing: f.canSeeClosing,
    canSeeLeadSource: f.canSeeLeadSource,
    canSeeTechnicianField: f.canSeeTechnicianField,
    canChangeJobType: f.canChangeJobType,
    canEditCustomerName: f.canEditCustomerName,
    canEditCustomerAddress: f.canEditCustomerAddress,
    canEditDescription: f.canEditDescription,
    canEditStatus: f.canEditStatus,
    canSeeCallerId: f.canSeeCallerId,
    canAdjustPercentages: f.canAdjustPercentages,
    canAdjustFees: f.canAdjustFees,
    canRefreshExtension: f.canRefreshExtension,
    canDeleteJob: f.canDeleteJob,
    canDuplicateJob: f.canDuplicateJob,
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
