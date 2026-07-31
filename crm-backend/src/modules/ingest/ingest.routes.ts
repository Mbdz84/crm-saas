import { Router } from "express";
import { apiKeyAuth } from "../../middleware/apiKeyAuth";
import { ingestJob } from "./ingest.controller";
import { incomingCall } from "../incomingCall/incomingCall.controller";

const router = Router();

router.post("/job", apiKeyAuth, ingestJob);

// Incoming dispatch-call recordings (per-lead-source API key). See
// docs/incoming-call-log.md — remove this line to disable the feature.
router.post("/call", apiKeyAuth, incomingCall);

export default router;