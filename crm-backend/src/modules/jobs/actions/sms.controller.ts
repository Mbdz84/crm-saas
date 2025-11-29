import prisma from "../../../prisma/client";
import twilio from "twilio";
import { Request, Response } from "express";
import { normalizePhone } from "../utils/phone";
import { defaultSmsSettings } from "../../smsSettings/smsSettings.controller";

/* TWILIO */
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const TWILIO_NUMBER = process.env.TWILIO_NUMBER;

/* ============================================================
   SEND TECH SMS  (honors maskedCalls flag)
============================================================ */
async function getOrCreateCallSession(job: any, technicianId: string) {
  const normalized = normalizePhone(job.customerPhone);
  if (!normalized) return null;

  const existing = await prisma.jobCallSession.findFirst({
    where: {
      jobId: job.id,
      technicianId,
      customerPhone: normalized,
    },
  });

  if (existing) return existing;

  const ext = Math.floor(100 + Math.random() * 900).toString();

  return prisma.jobCallSession.create({
    data: {
      jobId: job.id,
      technicianId,
      customerPhone: normalized,
      extension: ext,
      companyId: job.companyId,
    },
  });
}

export async function sendTechSms(techId: string, job: any) {
  const tech = await prisma.user.findUnique({ where: { id: techId } });

  if (!tech?.phone) return;
  if (!TWILIO_NUMBER) return;

  const company = await prisma.company.findUnique({
    where: { id: job.companyId },
  });

  if (!company) {
    console.error("❌ Company not found for job");
    return;
  }

  const settings =
    (company.smsSettings as any) || defaultSmsSettings;

  const maskingEnabled = !!tech.maskedCalls;

  const jobForSms = { ...job };
  let maskedInfo = "";

  if (maskingEnabled) {
    const session = await getOrCreateCallSession(job, techId);

    if (session && TWILIO_NUMBER) {
      const clean = TWILIO_NUMBER.replace(/^\+1/, "").replace(/[^\d]/g, "");
      jobForSms.customerPhone = `${clean},${session.extension}`;
    }
  }

  const baseText = buildSmsText(jobForSms, settings);
  const finalBody = `${baseText}${maskedInfo}`;

  try {
    await twilioClient.messages.create({
      to: tech.phone,
      from: TWILIO_NUMBER,
      body: finalBody,
    });
  } catch (err) {
    console.error("❌ SMS ERROR:", err);
  }
}

/* ============================================================
   RESEND SMS
============================================================ */
export async function resendJobSms(req: Request, res: Response) {
  try {
    const job = await prisma.job.findFirst({
      where: {
        shortId: req.params.shortId.toUpperCase(),
        companyId: req.user!.companyId,
      },
      include: { technician: true, jobType: true, source: true },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });
    if (!job.technicianId)
      return res.status(400).json({ error: "No technician assigned" });

    await sendTechSms(job.technicianId, job);

    res.json({ message: "SMS sent" });
  } catch (err) {
    console.error("🔥 RESEND SMS ERROR:", err);
    res.status(500).json({ error: "Failed to resend SMS" });
  }
}

/* ============================================================
   SMS BUILDER
============================================================ */
export function buildSmsText(job: any, settings: any): string {
  const lines: string[] = [];

  function getVal(key: string): string {
    switch (key) {
      case "id":
        return job.shortId || "";
      case "name":
        return job.customerName || "";
      case "phone":
        return job.customerPhone || "";
      case "address":
        return job.customerAddress || "";
      case "jobType":
        return job.jobType?.name || "";
      case "notes":
        return job.description || "";
      case "appointment":
        return job.scheduledAt
          ? new Date(job.scheduledAt).toLocaleString("en-US", {
              dateStyle: "short",
              timeStyle: "short",
            })
          : "";
      case "leadSource":
        return job.source?.name || "";
      default:
        return "";
    }
  }

  function getLabel(key: string): string {
    switch (key) {
      case "id":
        return "Job ID";
      case "name":
        return "Name";
      case "phone":
        return "Phone";
      case "address":
        return "Address";
      case "jobType":
        return "Job";
      case "notes":
        return "Notes";
      case "appointment":
        return "APP";
      case "leadSource":
        return "Source";
      default:
        return "";
    }
  }

  for (const key of settings.order) {
    if (!settings.show[key]) continue;

    const value = getVal(key);

    if (settings.showLabel[key]) {
      lines.push(`${getLabel(key)}: ${value}`);
    } else {
      lines.push(value);
    }
  }

  return lines.join("\n").trim();
}