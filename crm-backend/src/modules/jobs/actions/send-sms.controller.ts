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

/**
 * POST /jobs/:shortId/send-sms  { to, body }
 * Sends a text to a client from the CRM number (e.g. "call me back"),
 * records it in the SMS chat thread, and logs it on the job.
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
    if (!CRM_NUMBER)
      return res.status(500).json({ error: "CRM number not configured" });

    let twilioSid: string | null = null;
    try {
      const sent = await twilioClient.messages.create({
        from: CRM_NUMBER,
        to,
        body,
      });
      twilioSid = sent.sid;
    } catch (err: any) {
      console.error("🔥 sendClientSms Twilio error:", err?.message);
      return res.status(502).json({ error: "Failed to send SMS" });
    }

    // Thread it into Chat so a reply continues in the same conversation
    try {
      await recordOutboundSms({
        companyId: job.companyId,
        clientNumber: to,
        crmNumber: CRM_NUMBER,
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
      text: `Sent to ${to}\n\n${body}`,
      userId: req.user?.id,
    });

    return res.json({ ok: true, sid: twilioSid });
  } catch (err) {
    console.error("🔥 sendClientSms error:", err);
    return res.status(500).json({ error: "Failed to send SMS" });
  }
}
