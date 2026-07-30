import prisma from "../../../prisma/client";
import twilio from "twilio";
import { Request, Response } from "express";
import { defaultSmsSettings } from "../../smsSettings/smsSettings.controller";

/* TWILIO */
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const TWILIO_NUMBER = process.env.TWILIO_NUMBER;


async function getTechMaskedNumber(tech: any) {
  if (!tech?.maskedTwilioNumberSid) return null;

  const number = await twilioClient
    .incomingPhoneNumbers(tech.maskedTwilioNumberSid)
    .fetch();

  return number.phoneNumber; // +E164
}

/* ============================================================
   SEND TECH SMS  (honors maskedCalls flag)
============================================================ */
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

  const phones: string[] = [];

if (job.customerPhone) phones.push(job.customerPhone);
if (job.customerPhone2) phones.push(job.customerPhone2);

if (maskingEnabled) {
const sessions = await prisma.jobCallSession.findMany({
  where: {
    jobId: job.id,
    technicianId: techId,
    active: true,
  },
});
  if (sessions.length && TWILIO_NUMBER) {
    const masked = await getTechMaskedNumber(tech);
const clean = (masked || TWILIO_NUMBER)
  .replace(/^\+1/, "")
  .replace(/[^\d]/g, "");

    jobForSms.customerPhone = sessions
      .map((s: { extension: string }) => `${clean},${s.extension}`)
      .join(" / ");
  }
} else {
  jobForSms.customerPhone = phones.join(" / ");
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
              timeZone: job.timezone || "America/Chicago",
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

// ✅ skip empty values entirely
if (!value || !value.toString().trim()) {
  continue;
}

if (settings.showLabel[key]) {
  lines.push(`${getLabel(key)}: ${value}`);
} else {
  lines.push(value);
}
  }

  return lines.join("\n").trim();
}
/* ============================================================
   PREVIEW TECH SMS (NO SEND)
============================================================ */
export async function previewTechSms(req: Request, res: Response) {
  try {
    const job = await prisma.job.findFirst({
      where: {
        shortId: req.params.shortId.toUpperCase(),
        companyId: req.user!.companyId,
      },
      include: {
        technician: true,
        jobType: true,
        source: true,
        callSessions: {
      where: { active: true },
      orderBy: [
  { clientPhoneType: "asc" }, // primary first, secondary second
  { createdAt: "asc" },       // safety fallback
],
      },
      },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });
    if (!job.technicianId)
      return res.status(400).json({ error: "No technician assigned" });

    const tech = await prisma.user.findUnique({
      where: { id: job.technicianId },
    });

    if (!tech) return res.status(404).json({ error: "Technician not found" });

    const company = await prisma.company.findUnique({
      where: { id: job.companyId },
    });

    const settings =
      (company?.smsSettings as any) || defaultSmsSettings;

    const maskingEnabled = !!tech.maskedCalls;
    const jobForSms = { ...job };

    if (maskingEnabled && job.callSessions?.length) {
      const masked = await getTechMaskedNumber(tech);
const clean = (masked || process.env.TWILIO_NUMBER!)
  .replace(/^\+1/, "")
  .replace(/[^\d]/g, "");

      if (maskingEnabled && job.callSessions?.length) {
  const masked = await getTechMaskedNumber(tech);
const clean = (masked || process.env.TWILIO_NUMBER!)
  .replace(/^\+1/, "")
  .replace(/[^\d]/g, "");

  // ✅ enforce ONE session per phone type
  const primary = job.callSessions.find(
    (s) => s.clientPhoneType === "primary"
  );
  const secondary = job.callSessions.find(
    (s) => s.clientPhoneType === "secondary"
  );

  const phones: string[] = [];

  if (primary) {
    phones.push(`${clean},${primary.extension}`);
  }

  if (secondary) {
    phones.push(`${clean},${secondary.extension}`);
  }

  jobForSms.customerPhone = phones.join(" / ");
} else {
  jobForSms.customerPhone = [
    job.customerPhone,
    job.customerPhone2,
  ]
    .filter(Boolean)
    .join(" / ");
}
    } else {
      jobForSms.customerPhone = [
        job.customerPhone,
        job.customerPhone2,
      ]
        .filter(Boolean)
        .join(" / ");
    }

    const smsText = buildSmsText(jobForSms, settings);

    res.json({
      to: tech.phone,
      from: process.env.TWILIO_NUMBER,
      body: smsText,
      masked: maskingEnabled,
    });
  } catch (err) {
    console.error("🔥 SMS PREVIEW ERROR:", err);
    res.status(500).json({ error: "Failed to preview SMS" });
  }
}