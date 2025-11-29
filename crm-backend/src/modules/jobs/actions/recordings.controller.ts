import prisma from "../../../prisma/client";
import twilio from "twilio";
import { Request, Response } from "express";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function getJobRecordings(req: Request, res: Response) {
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

    if (!job) return res.status(404).json({ error: "Job not found" });

    const results: any[] = [];

    for (const rec of job.records) {
      try {
        const call = await twilioClient.calls(rec.callSid).fetch();

        const twilioRecordings = await twilioClient
          .calls(rec.callSid)
          .recordings.list();

        const formattedRecordings = [];

        for (const r of twilioRecordings) {
          const mp3Url =
            `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${r.sid}.mp3`;

          let transcript = "";

          try {
            const transList = await twilioClient
              .recordings(r.sid)
              .transcriptions.list();

            if (transList.length > 0) {
              transcript = transList[0].transcriptionText || "";
            }
          } catch {}

          formattedRecordings.push({
            recordingSid: r.sid,
            duration: r.duration,
            url: mp3Url,
            transcript,
          });
        }

        results.push({
          id: rec.id,
          callSid: rec.callSid,
          createdAt: rec.createdAt,
          from: call.from,
          to: call.to,
          status: call.status,
          recordings: formattedRecordings,
        });
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