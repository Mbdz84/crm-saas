import { Router } from "express";
import { apiKeyAuth } from "../../middleware/apiKeyAuth";
import { ingestJob } from "./ingest.controller";
import { incomingCall } from "../incomingCall/incomingCall.controller";

const router = Router();

router.post("/job", apiKeyAuth, ingestJob);

// Incoming dispatch-call recordings. The lead-source API key is in the JSON
// body (Twilio Studio can't send headers), so auth happens in the controller.
// See docs/incoming-call-log.md — remove this line to disable the feature.
router.post("/call", incomingCall);

export default router;