import { Request, Response } from "express";
import twilio from "twilio";
import prisma from "../../../prisma/client";
import { logJobEvent } from "../../../utils/jobLogger";
import { recordOutboundSms } from "../../messages/messages.controller";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const CRM_NUMBER = process.env.TWILIO_NUMBER;

function toE164(phone?: string): string | null {
  const digits = (phone || "").replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if ((phone || "").startsWith("+")) return phone as string;
  return null;
}

export type SmsSender = {
  from: string;
  /** Human label for the UI / job log, e.g. "Dave mask" or "CRM" */
  label: string;
  masked: boolean;
};

/**
 * Which number a client-facing SMS goes out from for this job.
 *
 * The assigned technician's masked number wins when masking is on, so the
 * client sees the same number the tech calls from and a reply/callback lands
 * on the tech's mask instead of the shared CRM line.
 *
 * Falls back to the CRM number whenever there is no masked number to use:
 * no technician assigned, masking toggled off, or no number provisioned.
 */
export async function resolveSmsSender(job: {
  technicianId: string | null;
}): Promise<SmsSender> {
  const fallback: SmsSender = {
    from: CRM_NUMBER || "",
    label: "CRM",
    masked: false,
  };

  if (!job.technicianId) return fallback;

  const tech = await prisma.user.findUnique({
    where: { id: job.technicianId },
    select: {
      name: true,
      maskedCalls: true,
      maskedTwilioNumberSid: true,
      maskedTwilioPhoneNumber: true,
    },
  });

  if (!tech?.maskedCalls || !tech.maskedTwilioNumberSid) return fallback;

  // Cached E.164 is written whenever the SID is saved; only hit Twilio when
  // the cache is empty (older tech records).
  let number = tech.maskedTwilioPhoneNumber || null;

  if (!number) {
    try {
      const fetched = await twilioClient
        .incomingPhoneNumbers(tech.maskedTwilioNumberSid)
        .fetch();
      number = fetched.phoneNumber;
    } catch (err: any) {
      console.error("⚠️ resolveSmsSender masked lookup failed:", err?.message);
      return fallback;
    }
  }

  if (!number) return fallback;

  return {
    from: number,
    label: `${tech.name} mask`,
    masked: true,
  };
}

/**
 * GET /jobs/:shortId/sms-sender
 * Tells the UI which number a client SMS would be sent from, so the
 * dispatcher sees it before hitting Send.
 */
export async function getSmsSender(req: Request, res: Response) {
  try {
    const { shortId } = req.params;

    const job = await prisma.job.findFirst({
      where: { shortId: shortId.toUpperCase(), companyId: req.user!.companyId },
      select: { technicianId: true },
    });
    if (!job) return res.status(404).json({ error: "Job not found" });

    const sender = await resolveSmsSender(job);
    return res.json(sender);
  } catch (err) {
    console.error("🔥 getSmsSender error:", err);
    return res.status(500).json({ error: "Failed to resolve SMS sender" });
  }
}

/**
 * POST /jobs/:shortId/send-sms  { to, body }
 * Sends a text to a client (e.g. "call me back") from the assigned
 * technician's masked number when there is one, otherwise from the CRM
 * number. Records it in the SMS chat thread and logs it on the job.
 */
export async function sendClientSms(req: Request, res: Response) {
  try {
    const { shortId } = req.params;
    const body = (req.body?.body || "").trim();
    const to = toE164(req.body?.to);

    const job = await prisma.job.findFirst({
      where: { shortId: shortId.toUpperCase(), companyId: req.user!.companyId },
    });
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (!body) return res.status(400).json({ error: "Message is empty" });
    if (!to) return res.status(400).json({ error: "Valid phone number required" });

    const sender = await resolveSmsSender(job);
    if (!sender.from)
      return res.status(500).json({ error: "No sending number configured" });

    let twilioSid: string | null = null;
    try {
      const sent = await twilioClient.messages.create({
        from: sender.from,
        to,
        body,
      });
      twilioSid = sent.sid;
    } catch (err: any) {
      console.error("🔥 sendClientSms Twilio error:", err?.message);
      return res.status(502).json({ error: "Failed to send SMS" });
    }

    // Thread it into Chat so a reply continues in the same conversation.
    // Keyed on the sending number, so a masked send threads under the mask —
    // matching where the client's reply will arrive.
    try {
      await recordOutboundSms({
        companyId: job.companyId,
        clientNumber: to,
        crmNumber: sender.from,
        body,
        twilioSid,
        customerName: job.customerName,
      });
    } catch (err) {
      console.error("⚠️ sendClientSms record-in-chat failed:", err);
    }

    await logJobEvent({
      jobId: job.id,
      type: "sms_sent",
      text: `From: ${sender.from} (${sender.label})\nTo: ${to}\n\n${body}`,
      userId: req.user?.id,
    });

    return res.json({ ok: true, sid: twilioSid, from: sender.from, masked: sender.masked });
  } catch (err) {
    console.error("🔥 sendClientSms error:", err);
    return res.status(500).json({ error: "Failed to send SMS" });
  }
}
