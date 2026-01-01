import { Request, Response } from "express";
import twilio from "twilio";
import prisma from "../../prisma/client";

const VoiceResponse = twilio.twiml.VoiceResponse;
const TWILIO_NUMBER = process.env.TWILIO_NUMBER!;

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
      const dial = twiml.dial({
        callerId: TWILIO_NUMBER,
        record: "record-from-answer",
      });

      dial.number(clientSession.lastCallerPhone);
      return send(res, twiml);
    }
  }

  /* ---------------------------------------
     EXTENSION FLOW — SINGLE 15s WAIT
  --------------------------------------- */
  const gather = twiml.gather({
    numDigits: 4,
    timeout: 15, // ✅ single 15s wait
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

  /* ---------------------------------------
     NO INPUT → HANG UP
  --------------------------------------- */
  if (!digits) {
    twiml.say("No extension was entered. Goodbye.");
    twiml.hangup();
    return send(res, twiml);
  }

  /* ---------------------------------------
     VALIDATE EXTENSION
  --------------------------------------- */
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

  /* ---------------------------------------
     SAVE LAST CALLER
  --------------------------------------- */
  await prisma.jobCallSession.update({
    where: { id: session.id },
    data: { lastCallerPhone: from },
  });

  /* ---------------------------------------
     CONNECT — CLIENT WHISPER
  --------------------------------------- */
  const dial = twiml.dial({
    callerId: TWILIO_NUMBER,
    record: "record-from-answer",
    recordingStatusCallback: `/twilio/recording?ext=${session.extension}`,
    recordingStatusCallbackMethod: "POST",
  });

  // ✅ Client hears whisper BEFORE call connects
  dial.number(
    {
      url: "/twilio/voice/client-whisper",
    },
    session.customerPhone
  );

  return send(res, twiml);
}

/* -----------------------------------------------------------
   CLIENT WHISPER (CALLED PARTY ONLY)
----------------------------------------------------------- */

export async function clientWhisper(req: Request, res: Response) {
  const twiml = new VoiceResponse();

  twiml.say(
    "This call is being recorded for quality and training purposes."
  );

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

    const ext = req.query.ext as string;
    if (!ext) return res.send("<Response />");

    const session = await prisma.jobCallSession.findFirst({
      where: { extension: ext },
    });

    if (!session) return res.send("<Response />");

    await prisma.jobRecord.create({
      data: {
        jobId: session.jobId,
        callSid: CallSid,
        recordingSid: RecordingSid,
        url: `${RecordingUrl}.mp3`,
        duration: Number(RecordingDuration) || null,
        parentCallSid: ParentCallSid || null,
      },
    });

    return res.send("<Response />");
  } catch (err) {
    console.error("RECORDING ERROR", err);
    return res.send("<Response />");
  }
}