import { Router } from "express";
import {
  inboundVoice,
  handleExtension,
  handleRecording,
  clientWhisper,
} from "./voice.controller";

const router = Router();

/* -----------------------------------------------------------
   MAIN INBOUND TWILIO VOICE WEBHOOK
----------------------------------------------------------- */
router.post("/voice", inboundVoice);

/* -----------------------------------------------------------
   EXTENSION HANDLER (DTMF)
----------------------------------------------------------- */
router.post("/voice/extension", handleExtension);

/* -----------------------------------------------------------
   CLIENT WHISPER (CALLED PARTY ONLY)
----------------------------------------------------------- */
router.post("/voice/client-whisper", clientWhisper);

/* -----------------------------------------------------------
   RECORDING WEBHOOK (KEEP)
----------------------------------------------------------- */
router.post("/recording", handleRecording);

export default router;