// crm-backend/src/constants/jobStatus.ts
export const JOB_STATUSES = [
  "Accepted",
  "In Progress",
  "Appointment",
  "On Hold",
  "Billing",
  "Closed",
  "Pending Close",
  "Canceled",
  "Pending Cancel",
  "Estimate",
  "Follow Up",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export function isValidJobStatus(value: any): value is JobStatus {
  return JOB_STATUSES.includes(value as JobStatus);
}

/**
 * Statuses where the job is effectively finished, so its Twilio call session
 * must be terminated and can no longer be reached/regenerated. "Pending"
 * variants count as terminal too — they're an approval gate after the tech is
 * already done. Exact JobStatus.name values (for Prisma `notIn` filters).
 */
export const TERMINAL_CALL_STATUSES = [
  "Closed",
  "Pending Close",
  "Canceled",
  "Pending Cancel",
] as const;

/** Case-insensitive check against the terminal set (also accepts "cancelled"). */
export function isTerminalCallStatus(name?: string | null): boolean {
  const n = (name || "").trim().toLowerCase();
  return [
    "closed",
    "pending close",
    "canceled",
    "cancelled",
    "pending cancel",
  ].includes(n);
}