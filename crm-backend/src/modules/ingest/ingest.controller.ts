import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { IngestJobPayload } from "./ingest.types";
import { nanoid } from "nanoid";

type JobOrigin = "ai_generated" | "incoming_sms" | "external_api";

export async function ingestJob(req: Request, res: Response) {
  const leadSource = (req as any).leadSource;
  const company = (req as any).company;
  const payload = req.body as IngestJobPayload;

  const origin: JobOrigin = payload.origin || "external_api";

  if (!payload.customerPhone && !payload.customerName) {
    return res.status(400).json({
      error: "customerPhone or customerName is required",
    });
  }

  /* ------------------------------------------
     JOB TYPE (optional match only)
  ------------------------------------------ */
  let jobTypeId: string | undefined;

  if (payload.jobType) {
    const jt = await prisma.jobType.findFirst({
      where: {
        companyId: company.id,
        name: payload.jobType,
        active: true,
      },
    });
    if (jt) jobTypeId = jt.id;
  }

  /* ------------------------------------------
     LOG TYPE (single source of truth)
  ------------------------------------------ */
  const logType =
    origin === "ai_generated"
      ? "ai_generated"
      : origin === "incoming_sms"
      ? "incoming_sms"
      : "ingested";

  const logText =
    origin === "ai_generated"
      ? "AI agent created the job (Direct JSON ingest)"
      : origin === "incoming_sms"
      ? "Job created from incoming SMS (Direct JSON ingest)"
      : `Job created via API from lead source "${leadSource.name}"`;

  /* ------------------------------------------
     CREATE JOB
  ------------------------------------------ */
  const job = await prisma.job.create({
    data: {
      shortId: nanoid(6).toUpperCase(),
      title: payload.jobType || "New Job",
      description: payload.description || null,

      customerName: payload.customerName || null,
      customerPhone: payload.customerPhone || null,
      customerPhone2: payload.customerPhone2 || null,
      customerAddress: payload.customerAddress || null,

      scheduledAt: payload.scheduledAt
        ? new Date(payload.scheduledAt)
        : null,

      timezone:
        payload.timezone ||
        leadSource.company.timezone ||
        "America/Chicago",

      companyId: company.id,
      sourceId: leadSource.id,
      jobTypeId,

      status: "Accepted",

      logs: {
        create: {
          type: logType,
          text: logText,
        },
      },
    },
  });

  return res.json({
    success: true,
    jobId: job.id,
    shortId: job.shortId,
  });
}