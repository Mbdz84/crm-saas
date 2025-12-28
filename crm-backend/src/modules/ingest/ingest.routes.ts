import { Router } from "express";
import { apiKeyAuth } from "../../middleware/apiKeyAuth";
import { ingestJob } from "./ingest.controller";

const router = Router();

router.post("/job", apiKeyAuth, ingestJob);

export default router;