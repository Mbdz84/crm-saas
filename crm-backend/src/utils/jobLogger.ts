import prisma from "../prisma/client";

type LogInput = {
  jobId: string;
  type:
    | "created"
    | "updated"
    | "status_changed"
    | "assigned_technician"
    | "timezone_changed"
    | "scheduled"
    | "closed"
    | "canceled"
    | "reopened" 
    | "parsed_sms"
    | "system";
  text: string;
  userId?: string | null;
};

export async function logJobEvent({
  jobId,
  type,
  text,
  userId = null,
}: LogInput) {
  try {
    await prisma.jobLog.create({
      data: {
        jobId,
        type,
        text,
        userId,
      },
    });
  } catch (err) {
    // Logging must NEVER break the main flow
    console.error("⚠️ JobLog failed:", err);
  }
}