import prisma from "../../../prisma/client";
import twilio from "twilio";
import { Request, Response } from "express";
import { jobViewer, ownJobsWhere } from "../../../utils/scope";

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

function recordingUrl(recordingSid?: string | null) {
  return recordingSid
    ? `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${recordingSid}`
    : null;
}

// Map a (cached) JobRecord row to the shape the frontend expects
function buildResult(rec: any) {
  return {
    recordingSid: rec.recordingSid || null,
    callSid: rec.callSid,
    createdAt: rec.createdAt,
    from: rec.from || null,
    to: rec.to || null,
    status: rec.status || null,
    duration: rec.duration || 0,
    transcript: rec.transcript || null,
    url: recordingUrl(rec.recordingSid),
  };
}

export async function getJobRecordings(req: Request, res: Response) {
  try {
    // Technicians without recordings access get nothing from this endpoint.
    const viewer = await jobViewer(req);
    if (!viewer.canSeeRecordings) return res.json([]);

    const job = await prisma.job.findFirst({
      where: {
        shortId: req.params.shortId.toUpperCase(),
        companyId: req.user!.companyId,
        ...(await ownJobsWhere(req)),
      },
      include: { records: true },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const results: any[] = [];

    for (const rec of job.records) {
      /* --------------------------------------------------------
         CACHED: already enriched (from/to resolved before).
         Serve straight from our DB — no Twilio calls.
      -------------------------------------------------------- */
      if (rec.from) {
        // One-time transcript backfill if a recording exists but the
        // transcript wasn't ready yet last time.
        if (rec.recordingSid && !rec.transcript) {
          try {
            const trs = await twilioClient
              .recordings(rec.recordingSid)
              .transcriptions.list();
            const t = trs[0]?.transcriptionText || "";
            if (t) {
              await prisma.jobRecord.update({
                where: { id: rec.id },
                data: { transcript: t },
              });
              rec.transcript = t;
            }
          } catch {}
        }
        results.push(buildResult(rec));
        continue;
      }

      /* --------------------------------------------------------
         NEW: enrich once from Twilio, then persist onto the row.
      -------------------------------------------------------- */
      try {
        const call = await twilioClient.calls(rec.callSid).fetch();
        const { from, to } = await resolveFromTo(rec.callSid, job.customerPhone);

        let recordingSid = rec.recordingSid || null;
        if (!recordingSid) {
          const recs = await twilioClient.calls(rec.callSid).recordings.list();
          if (recs.length > 0) recordingSid = recs[0].sid;
        }

        let transcript = rec.transcript || "";
        if (recordingSid && !transcript) {
          try {
            const trs = await twilioClient
              .recordings(recordingSid)
              .transcriptions.list();
            transcript = trs[0]?.transcriptionText || "";
          } catch {}
        }

        const data = {
          from: from || null,
          to: to || null,
          status: call.status || null,
          duration: call.duration ? Number(call.duration) : rec.duration || 0,
          recordingSid,
          url: recordingUrl(recordingSid),
          transcript: transcript || null,
        };

        await prisma.jobRecord.update({ where: { id: rec.id }, data });
        results.push(buildResult({ ...rec, ...data }));
      } catch (err) {
        console.error("❌ recordings enrich error:", err);
        results.push(buildResult(rec)); // serve whatever we already have
      }
    }

    results.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.json(results);
  } catch (err) {
    console.error("🔥 getJobRecordings error:", err);
    return res.status(500).json({ error: "Failed to load recordings" });
  }
}