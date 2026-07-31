import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { hashApiKey } from "../../utils/apiKey";
import { callLogEnabled, attachCallToExistingJobs } from "./incomingCall.service";

/* ============================================================
   POST /api/ingest/call
   Each lead source's Twilio Studio flow posts its call here.
   Twilio's "Make HTTP Request" widget can't send custom headers,
   so the lead source's API key is sent in the JSON BODY as
   `apiKey` (an Authorization: Bearer header is also accepted for
   curl testing). The key resolves the lead source (and company).
   Body: { apiKey, callSid, from, to?, duration?, recordingUrl? }
============================================================ */
export async function incomingCall(req: Request, res: Response) {
  // Disabled → ack so Studio doesn't retry.
  if (!callLogEnabled()) return res.json({ ok: true, disabled: true });

  try {
    const body = req.body || {};

    // API key from body, or Authorization: Bearer (for curl).
    const headerKey = (req.headers.authorization || "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    const rawKey = String(body.apiKey || headerKey || "").trim();

    if (!rawKey) {
      return res.status(401).json({ error: "Missing API key" });
    }

    const leadSource = await prisma.leadSource.findFirst({
      where: { apiKeyHash: hashApiKey(rawKey), active: true },
      include: { company: true },
    });

    if (!leadSource) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    const { callSid, from, to, duration, recordingUrl } = body;

    if (!callSid || !from) {
      return res.status(400).json({ error: "callSid and from are required" });
    }

    const durationNum =
      duration != null && duration !== "" ? parseInt(String(duration), 10) : null;

    // Idempotent on callSid (Studio may retry).
    const call = await prisma.inboundCall.upsert({
      where: { callSid: String(callSid) },
      create: {
        companyId: leadSource.companyId,
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
