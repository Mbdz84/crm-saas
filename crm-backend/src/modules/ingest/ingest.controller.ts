import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { IngestJobPayload } from "./ingest.types";
import { nanoid } from "nanoid";

export async function ingestJob(req: Request, res: Response) {
  const leadSource = (req as any).leadSource;
  const company = (req as any).company;
  const payload = req.body as IngestJobPayload;

  if (!payload.customerPhone && !payload.customerName) {
    return res.status(400).json({
      error: "customerPhone or customerName is required",
    });
  }

  // Find job type if provided
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
  createMany: {
    data: [
      {
        type: "ingested",
        text: `Job created via API from lead source "${leadSource.name}"`,
      },
      {
        type: "ai_generated",
        text: [
          `Source: ${leadSource.name}`,
          payload.externalId ? `Job ID: ${payload.externalId}` : null,
          payload.customerName ? `Name: ${payload.customerName}` : null,
          payload.customerPhone ? `Phone: ${payload.customerPhone}` : null,
          payload.customerAddress
            ? `Address: ${payload.customerAddress}`
            : null,
          payload.description ? `Notes: ${payload.description}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
  },
},
    },
  });

  res.json({
    success: true,
    jobId: job.id,
    shortId: job.shortId,
  });
}