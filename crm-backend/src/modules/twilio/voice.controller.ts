import { Request, Response } from "express";
import twilio from "twilio";
import prisma from "../../prisma/client";

const VoiceResponse = twilio.twiml.VoiceResponse;
const TWILIO_NUMBER = process.env.TWILIO_NUMBER;
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

/**
 * Entry point for ALL inbound calls to your Twilio number.
 * Configure Twilio phone number → Voice URL → POST https://your-api/twilio/voice
 */
export async function handleIncomingCall(req: Request, res: Response) {
  const from = req.body.From as string;
  const to = req.body.To as string;

  const twiml = new VoiceResponse();

  try {
    // 1) See if caller is a TECH (phone matches a user)
    const tech = await prisma.user.findFirst({
      where: { phone: from },
    });

    if (tech) {
  const gather = twiml.gather({
    input: ["dtmf"],
    numDigits: 4,
    action: "https://cher-cnidophorous-ramon.ngrok-free.dev/twilio/voice/bridge-tech",
    method: "POST",
    timeout: 8
  });

gather.say("Please enter the job extension.");


  // IMPORTANT: Do NOT add fallback messages here.
  // Twilio will handle timeout by hitting no-Digits fallback inside bridge controller.

  return res.type("text/xml").send(twiml.toString());
}

    // 2) Caller is likely CUSTOMER – try to route back to last tech
    const session = await prisma.jobCallSession.findFirst({
      where: {
        customerPhone: from,
      },
      orderBy: { createdAt: "desc" },
      include: { technician: true },
    });

    if (!session || !session.technician?.phone) {
      twiml.say(
        "We could not find an active technician for your call. Please contact support."
      );
      twiml.hangup();
      res.type("text/xml").send(twiml.toString());
      return;
    }

    // Bridge to technician
    twiml.say(`Call from job extension ${session.extension}`);

    const dial = twiml.dial({
      callerId: TWILIO_NUMBER, // customer sees Twilio number as caller ID
      record: "record-from-answer", // optional
    });
    dial.number(session.technician.phone);

    res.type("text/xml").send(twiml.toString());
  } catch (err) {
    console.error("VOICE INCOMING ERROR", err);
    twiml.say("We are unable to process your call right now.");
    twiml.hangup();
    res.type("text/xml").send(twiml.toString());
  }
}

/**
 * Step 2 for TECH calls: We already asked for extension, now bridge to customer.
 */
export async function bridgeTechToCustomer(req: Request, res: Response) {
  const from = req.body.From as string;
  const digits = req.body.Digits as string; // extension entered

  const twiml = new VoiceResponse();

  try {
    if (!digits) {
      twiml.say("No extension received. Goodbye.");
      twiml.hangup();
      return res.type("text/xml").send(twiml.toString());
    }

    // Find session by extension + tech phone
    const session = await prisma.jobCallSession.findFirst({
      where: {
        extension: digits,
        technician: {
          phone: from,
        },
      },
    });

    if (!session) {
      twiml.say("We could not find a job with that extension.");
      twiml.hangup();
      return res.type("text/xml").send(twiml.toString());
    }

    // Bridge to customer
    twiml.say("From the locksmith company. This call is being recorded.");

    const dial = twiml.dial({
  callerId: TWILIO_NUMBER,
  record: "record-from-answer",
  recordingStatusCallback: `${process.env.PUBLIC_URL}/twilio/recording?ext=${session.extension}`,
  recordingStatusCallbackMethod: "POST",
});

dial.number(session.customerPhone);

    res.type("text/xml").send(twiml.toString());
  } catch (err) {
    console.error("VOICE BRIDGE ERROR", err);
    twiml.say("We are unable to connect your call.");
    twiml.hangup();
    res.type("text/xml").send(twiml.toString());
  }
}

/**
 * Simple timeout handler if no digits entered.
 */
export function handleVoiceTimeout(req: Request, res: Response) {
  const twiml = new VoiceResponse();
  twiml.say("No input received. Goodbye.");
  twiml.hangup();
  res.type("text/xml").send(twiml.toString());
}

/* ============================================================
   TWILIO RECORDING WEBHOOK (save call recordings per job)
============================================================ */
export async function handleRecording(req: Request, res: Response) {
  console.log("🔔 RECORDING WEBHOOK HIT");
  console.log("BODY:", req.body);
  console.log("QUERY:", req.query);

  try {
    const {
      CallSid,
      RecordingUrl,
      From,
      To,
      RecordingSid,
      RecordingDuration,
      ParentCallSid,
      Direction
    } = req.body;

    const ext = req.query.ext as string;

    if (!ext) {
      console.log("❌ Missing extension in callback");
      return res.send("<Response></Response>");
    }

    // Get session
    const session = await prisma.jobCallSession.findFirst({
      where: { extension: ext }
    });

    if (!session) {
      console.log("❌ No matching session for EXT", ext);
      return res.send("<Response></Response>");
    }

    const twilioNumber = process.env.TWILIO_NUMBER;

    // ----------------------------------------------------------
    // SMART LOGIC TO FIX “To shows Twilio number”
    // ----------------------------------------------------------
    let finalFrom = From;
    let finalTo = To;

    const isLegB =
      From === twilioNumber ||
      Direction === "outbound-dial" ||
      To === session.customerPhone;

    if (isLegB) {
      console.log("📞 Identified LEG B (Twilio → Customer)");
      finalFrom = session.technicianId ? session.technicianId : From;
      finalTo = session.customerPhone;
    } else {
      console.log("📱 Identified LEG A (Tech → Twilio)");
      finalFrom = From; // technician
      finalTo = session.customerPhone; // FIXED ✔
    }

    // Save recording
    await prisma.jobRecord.create({
      data: {
        jobId: session.jobId,
        callSid: CallSid,
        recordingSid: RecordingSid,
        from: finalFrom,
        to: finalTo,
        url: `${RecordingUrl}.mp3`,
        duration: Number(RecordingDuration) || null,
        parentCallSid: ParentCallSid || null
      }
    });

    console.log("🎙 Saved recording for job:", session.jobId);

    return res.send("<Response></Response>");
  } catch (err) {
    console.error("🔥 RECORDING WEBHOOK ERROR:", err);
    return res.send("<Response></Response>");
  }
}

//// ends

/**
 * GET JOB RECORDINGS (with Live Twilio Metadata)
 */
export async function getJobRecordings(req: Request, res: Response) {
  try {
    const shortId = req.params.shortId.toUpperCase();

    const job = await prisma.job.findFirst({
      where: {
        shortId,
        companyId: req.user!.companyId,
      },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Fetch stored entries from DB
    const dbRecords = await prisma.jobRecord.findMany({
      where: { jobId: job.id },
      orderBy: { createdAt: "desc" },
    });

    // If nothing stored → return empty array
    if (dbRecords.length === 0) {
      return res.json([]);
    }

    // TWILIO CLIENT
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    // ------------------------------------------------------------
    // ENRICH EACH RECORD WITH TWILIO LIVE METADATA
    // ------------------------------------------------------------
    const enriched = [];

    for (const rec of dbRecords) {
      let liveCall: any = null;
      let liveRecordings: any[] = [];

      try {
        // 1️⃣ Fetch call details (From / To / Status etc.)
        liveCall = await twilioClient.calls(rec.callSid).fetch();
      } catch (err) {
        console.log("⚠️ Failed to fetch call:", rec.callSid);
      }

      try {
        // 2️⃣ Fetch ALL recordings for this call
        liveRecordings = await twilioClient
          .calls(rec.callSid)
          .recordings.list({ limit: 10 });
      } catch (err) {
        console.log("⚠️ Failed to fetch recordings for call:", rec.callSid);
      }

      // Transform each Twilio recording into UI format
      const recordingFiles = liveRecordings.map((r: any) => ({
        recordingSid: r.sid,
        duration: r.duration || null,
        url: `https://api.twilio.com${r.uri.replace('.json', '.mp3')}`,
        transcript: null, // can be fetched later
      }));

      enriched.push({
        id: rec.id,
        createdAt: rec.createdAt,
        callSid: rec.callSid,

        // Prefer Twilio live "From / To" over DB
        from: liveCall?.from || rec.from || "Unknown",
        to: liveCall?.to || rec.to || "Unknown",

        // Twilio call metadata
        status: liveCall?.status || "unknown",
        direction: liveCall?.direction || null,
        duration: liveCall?.duration || null,
        startTime: liveCall?.startTime || null,
        endTime: liveCall?.endTime || null,

        // Recording group
        recordings: recordingFiles.length
          ? recordingFiles
          : [
              {
                recordingSid: rec.recordingSid,
                url: rec.url,
                duration: null,
                transcript: null,
              },
            ],
      });
    }

    return res.json(enriched);
  } catch (err) {
    console.error("🔥 GET JOB RECORDINGS ERROR:", err);
    return res.status(500).json({ error: "Failed to load recordings" });
  }
}