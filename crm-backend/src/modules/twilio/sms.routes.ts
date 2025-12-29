import { Router } from "express";
import { incomingSms } from "./twilio.ai.sms.controller";

const router = Router();

router.post("/sms", incomingSms);

export default router;