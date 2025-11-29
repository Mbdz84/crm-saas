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