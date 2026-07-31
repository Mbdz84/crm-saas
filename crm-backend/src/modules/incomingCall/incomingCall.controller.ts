import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { callLogEnabled, attachCallToExistingJobs } from "./incomingCall.service";

/* ============================================================
   POST /api/ingest/call   (protected by apiKeyAuth)
   Each lead source's Twilio Studio flow posts its call here using
   that lead source's API key (Bearer). apiKeyAuth resolves
   req.leadSource + req.company from the key, so the call is tagged
   to the right lead source automatically.
   Body: { callSid, from, to?, duration?, recordingUrl? }
============================================================ */
export async function incomingCall(req: Request, res: Response) {
  // Disabled → ack so Studio doesn't retry.
  if (!callLogEnabled()) return res.json({ ok: true, disabled: true });

  try {
    const leadSource = (req as any).leadSource;
    const company = (req as any).company;

    const { callSid, from, to, duration, recordingUrl } = req.body || {};

    if (!callSid || !from) {
      return res.status(400).json({ error: "callSid and from are required" });
    }

    const durationNum =
      duration != null && duration !== "" ? parseInt(String(duration), 10) : null;

    // Idempotent on callSid (Studio may retry).
    const call = await prisma.inboundCall.upsert({
      where: { callSid: String(callSid) },
      create: {
        companyId: company.id,
        leadSourceId: leadSource.id,
        leadSourceName: leadSource.name,
        callSid: String(callSid),
        fromNumber: String(from),
        toNumber: to ? String(to) : null,
        duration: Number.isFinite(durationNum as number) ? durationNum : null,
        recordingUrl: recordingUrl ? String(recordingUrl) : null,
        occurredAt: new Date(),
      },
      update: {
        recordingUrl: recordingUrl ? String(recordingUrl) : undefined,
        duration: Number.isFinite(durationNum as number)
          ? (durationNum as number)
          : undefined,
      },
    });

    // Attach to any jobs that already exist (call-first path).
    await attachCallToExistingJobs(call);

    return res.json({ ok: true });
  } catch (err) {
    console.error("🔥 incomingCall error:", err);
    // 200 so Twilio Studio doesn't hammer retries on our errors.
    return res.status(200).json({ ok: false });
  }
}
