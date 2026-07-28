import { Request, Response } from "express";
import twilio from "twilio";
import prisma from "../../prisma/client";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const VoiceResponse = twilio.twiml.VoiceResponse;

/* -----------------------------------------------------------
   RESOLVE CALLER ID (PER TECH)
----------------------------------------------------------- */
async function getCallerIdForSession(session: any): Promise<string> {
  if (!session?.technicianId) {
    return process.env.TWILIO_NUMBER!;
  }

  const tech = await prisma.user.findUnique({
    where: { id: session.technicianId },
    select: { maskedTwilioNumberSid: true },
  });

  if (!tech?.maskedTwilioNumberSid) {
    return process.env.TWILIO_NUMBER!;
  }

  const number = await twilioClient
    .incomingPhoneNumbers(tech.maskedTwilioNumberSid)
    .fetch();

  return number.phoneNumber; // +E164
}

/* -----------------------------------------------------------
   HELPERS
----------------------------------------------------------- */
function normalize(phone?: string): string {
  return (phone || "").replace(/[^\d]/g, "").slice(-10);
}

function send(res: Response, twiml: twilio.twiml.VoiceResponse) {
  res.type("text/xml");
  res.send(twiml.toString());
}

/* -----------------------------------------------------------
   ENTRY POINT — ALL INBOUND CALLS
----------------------------------------------------------- */
export async function inboundVoice(req: Request, res: Response) {
  const twiml = new VoiceResponse();
  const from = normalize(req.body.From);

  /* ---------------------------------------
     CLIENT CALLBACK FLOW
  --------------------------------------- */
  if (from) {
    const clientSession = await prisma.jobCallSession.findFirst({
      where: {
        customerPhone: { endsWith: from },
        lastCallerPhone: { not: null },
        active: true,
        job: { status: { notIn: ["Closed", "Canceled"] } },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (clientSession?.lastCallerPhone) {
      // Save inbound CallSid
      await prisma.jobCallSession.update({
        where: { id: clientSession.id },
        data: { lastInboundCallSid: req.body.CallSid },
      });

      const callerId = await getCallerIdForSession(clientSession);

      const dial = twiml.dial({
        callerId,
        record: "record-from-ringing",
        recordingStatusCallback: "/twilio/recording",
        recordingStatusCallbackMethod: "POST",
        action: "/twilio/voice/dial-complete",
        method: "POST",
      });

      dial.number(clientSession.lastCallerPhone);
      return send(res, twiml);
    }
  }

  /* ---------------------------------------
     EXTENSION FLOW
  --------------------------------------- */
  const gather = twiml.gather({
    numDigits: 4,
    timeout: 15,
    method: "POST",
    action: "/twilio/voice/extension",
  });

  gather.say("Please dial the extension.");
  return send(res, twiml);
}

/* -----------------------------------------------------------
   EXTENSION HANDLER
----------------------------------------------------------- */
export async function handleExtension(req: Request, res: Response) {
  const twiml = new VoiceResponse();
  const from = normalize(req.body.From);
  const digits = req.body.Digits;

  if (!digits) {
    twiml.say("No extension was entered. Goodbye.");
    twiml.hangup();
    return send(res, twiml);
  }

  const session = await prisma.jobCallSession.findFirst({
    where: {
      extension: digits,
      active: true,
      job: { status: { notIn: ["Closed", "Canceled"] } },
    },
  });

  if (!session) {
    twiml.say("Invalid or expired extension. Goodbye.");
    twiml.hangup();
    return send(res, twiml);
  }

  await prisma.jobCallSession.update({
    where: { id: session.id },
    data: { lastCallerPhone: from },
  });

  const callerId = await getCallerIdForSession(session);


console.log("📞 FORCED TECH CALLER ID =", callerId);

const dial = twiml.dial({
  callerId, // ✅ ALWAYS technician’s assigned masked number
  record: "record-from-ringing",
  recordingStatusCallback: `/twilio/recording?ext=${session.extension}`,
  recordingStatusCallbackMethod: "POST",
  action: "/twilio/voice/dial-complete",
  method: "POST",
});

  // Track outbound parent CallSid
  await prisma.jobCallSession.update({
    where: { id: session.id },
    data: { lastOutboundCallSid: req.body.CallSid },
  });

  dial.number(
    { url: "/twilio/voice/client-whisper" },
    session.customerPhone
  );

  return send(res, twiml);
}

/* -----------------------------------------------------------
   CLIENT WHISPER
----------------------------------------------------------- */
export async function clientWhisper(req: Request, res: Response) {
  const twiml = new VoiceResponse();
  twiml.say("This call is being recorded for quality control.");
  return send(res, twiml);
}

/* -----------------------------------------------------------
   RECORDING WEBHOOK
----------------------------------------------------------- */
export async function handleRecording(req: Request, res: Response) {
  try {
    const {
      RecordingUrl,
      RecordingSid,
      RecordingDuration,
      CallSid,
      ParentCallSid,
    } = req.body;

    let session = null;

    const ext = req.query.ext as string | undefined;
    if (ext) {
      session = await prisma.jobCallSession.findFirst({
        where: { extension: ext },
      });
    }

    if (!session && CallSid) {
      session = await prisma.jobCallSession.findFirst({
        where: { lastInboundCallSid: CallSid },
      });
    }

    if (!session) {
      return res.send("<Response />");
    }

    await prisma.jobRecord.create({
      data: {
        jobId: session.jobId,
        callSid: CallSid,
        recordingSid: RecordingSid,
        url: RecordingUrl,
        duration: Number(RecordingDuration) || null,
        parentCallSid: ParentCallSid || null,
      },
    });

    return res.send("<Response />");
  } catch {
    return res.send("<Response />");
  }
}

/* -----------------------------------------------------------
   DIAL COMPLETE (FAILED CALLS)
----------------------------------------------------------- */
export async function dialComplete(req: Request, res: Response) {
  // Never let this webhook crash the process or return non-200 to Twilio —
  // that's what caused missed-call attempts to be dropped (HTTP 503).
  try {
    const {
      DialCallStatus,
      DialCallSid,
      DialCallDuration,
      CallSid,
      From,
      To,
    } = req.body;

    console.log("📞 DIAL-COMPLETE", {
      DialCallStatus,
      CallSid,
      DialCallSid,
      DialCallDuration,
    });

    // Answered calls are logged via the recording callback, not here.
    if (DialCallStatus === "completed") {
      return res.send("<Response />");
    }

    const session = await prisma.jobCallSession.findFirst({
      where: {
        OR: [
          { lastInboundCallSid: CallSid },
          { lastOutboundCallSid: CallSid },
        ],
      },
    });

    if (!session) {
      console.warn("⚠️ DIAL-COMPLETE: no session matched CallSid", CallSid);
      return res.send("<Response />");
    }

    const record = await prisma.jobRecord.create({
      data: {
        jobId: session.jobId,
        callSid: DialCallSid || CallSid,
        recordingSid: null,
        url: null,
        from: From || null,
        to: To || session.customerPhone || null,
        duration: Number(DialCallDuration) || 0,
        status: DialCallStatus,
      },
    });

    console.log("✅ DIAL-COMPLETE: saved missed-call record", {
      jobId: session.jobId,
      status: DialCallStatus,
      recordId: record.id,
    });
  } catch (err) {
    console.error("🔥 DIAL-COMPLETE ERROR:", err);
  }

  // Always ACK Twilio with a valid 200 response.
  return res.send("<Response />");
}