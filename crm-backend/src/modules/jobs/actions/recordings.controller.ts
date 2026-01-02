import prisma from "../../../prisma/client";
import twilio from "twilio";
import { Request, Response } from "express";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

function normalizePhone(phone?: string | null) {
  return (phone || "").replace(/[^\d]/g, "").slice(-10);
}

async function resolveFromTo(callSid: string, customerPhone?: string | null) {
  const customer10 = normalizePhone(customerPhone);

  const call = await twilioClient.calls(callSid).fetch();

  // If this is a CHILD leg, load its PARENT
  if (call.parentCallSid) {
    const parent = await twilioClient.calls(call.parentCallSid).fetch();

    const childTo10 = normalizePhone(call.to);

    // If child "to" is the customer => this is Tech → Customer leg
    if (customer10 && childTo10 === customer10) {
      return { from: parent.from, to: call.to }; // TECH -> CUSTOMER
    }

    // Otherwise this is Customer → Tech callback leg
    return { from: parent.from, to: call.to }; // CUSTOMER -> TECH
  }

  // If this is a PARENT leg, try to find a CHILD (Dial leg)
  const children = await twilioClient.calls.list({
    parentCallSid: call.sid,
    limit: 20,
  });

  // prefer a child that goes to the customer (tech->customer) or otherwise first child
  const child =
    children.find((c) => customer10 && normalizePhone(c.to) === customer10) ||
    children[0];

  if (child) {
    // Parent is either TECH->TWILIO or CUSTOMER->TWILIO depending on flow
    // If child goes to customer => tech->customer
    if (customer10 && normalizePhone(child.to) === customer10) {
      return { from: call.from, to: child.to }; // TECH -> CUSTOMER
    }
    // else customer->tech callback
    return { from: call.from, to: child.to }; // CUSTOMER -> TECH
  }

  // fallback (no child existed)
  return { from: call.from, to: call.to };
}

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
        const call = await twilioClient.calls(rec.callSid).fetch();
const { from, to } = await resolveFromTo(rec.callSid, job.customerPhone);

        const twilioRecordings = await twilioClient
          .calls(rec.callSid)
          .recordings.list();

        // ✅ HAS RECORDINGS
        if (twilioRecordings.length > 0) {
          for (const r of twilioRecordings) {
            let transcript = "";

            try {
              const transcriptions = await twilioClient
                .recordings(r.sid)
                .transcriptions.list();

              if (transcriptions.length > 0) {
                transcript = transcriptions[0].transcriptionText || "";
              }
            } catch {}

            results.push({
  recordingSid: r.sid,
  callSid: rec.callSid,
  createdAt: rec.createdAt,
  from,
  to,
  status: call.status,
duration: call.duration || 0,
  transcript,
  url: `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${r.sid}`,
});
          }
        }
        // ❌ FAILED / NO ANSWER
        else {
  results.push({
    recordingSid: null,
    callSid: rec.callSid,
    createdAt: rec.createdAt,
    from,
    to,
    status: call.status,
    duration: call.duration || 0,
    transcript: null,
    url: null,
  });
}
      } catch (err) {
        console.error("❌ Twilio call fetch error", err);
      }
    }

    return res.json(results);
  } catch (err) {
    console.error("🔥 getJobRecordings error:", err);
    return res.status(500).json({ error: "Failed to load recordings" });
  }
}