import { Router } from "express";
import {
  inboundVoice,
  handleExtension,
  handleRecording,
  } from "./voice.controller";

const router = Router();

// MAIN inbound Twilio voice webhook
router.post("/voice", inboundVoice);

// Extension handler (DTMF)
router.post("/voice/extension", handleExtension);

// Recording webhook (KEEP)
router.post("/recording", handleRecording);

export default router;