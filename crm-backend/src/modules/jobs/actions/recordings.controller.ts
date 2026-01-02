import prisma from "../../../prisma/client";
import twilio from "twilio";
import { Request, Response } from "express";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function getJobRecordings(req: Request, res: Response) {
  console.log("📞 GET /jobs/:shortId/recordings HIT", {
  shortId: req.params.shortId,
  companyId: req.user?.companyId,
});
  try {
    const job = await prisma.job.findFirst({
      where: {
        shortId: req.params.shortId.toUpperCase(),
        companyId: req.user!.companyId,
      },
      include: {
        records: true,
      },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const results: any[] = [];

    for (const rec of job.records) {
      try {
        // Fetch call details
        const call = await twilioClient.calls(rec.callSid).fetch();

        // Fetch recordings for this call
        const twilioRecordings = await twilioClient
          .calls(rec.callSid)
          .recordings.list();

        for (const r of twilioRecordings) {
          let transcript = "";

          try {
            const transcriptions = await twilioClient
              .recordings(r.sid)
              .transcriptions.list();

            if (transcriptions.length > 0) {
              transcript =
                transcriptions[0].transcriptionText || "";
            }
          } catch {
            // transcription optional
          }

          results.push({
  recordingSid: r.sid,                      // required
  callSid: rec.callSid,
  createdAt: rec.createdAt,
  from: call.from,
  to: call.to,
  status: call.status,
  duration: r.duration,
  transcript,

  // ✅ THIS FIXES PLAYER + DOWNLOAD
  url: `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${r.sid}`,
});
        }
      } catch (err) {
        console.error("❌ Twilio recording fetch error", err);
      }
    }

    return res.json(results);
  } catch (err) {
    console.error("🔥 getJobRecordings error:", err);
    return res.status(500).json({ error: "Failed to load recordings" });
  }
}