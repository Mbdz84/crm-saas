import { Router } from "express";
import {
  handleIncomingCall,
  bridgeTechToCustomer,
  handleVoiceTimeout,
  handleRecording
} from "./voice.controller";

const router = Router();

// Twilio sends form-urlencoded by default
router.post("/voice", handleIncomingCall);
router.post("/voice/bridge-tech", bridgeTechToCustomer);
router.post("/voice/voice-timeout", handleVoiceTimeout);
router.post("/recording", handleRecording);


export default router;