import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { tenantMiddleware } from "../../middleware/tenant";
import { getMaskedTwilioNumbers } from "./system.controller";

const router = Router();

/**
 * GET /system/twilio/masked-numbers
 */
router.get(
  "/twilio/masked-numbers",
  authMiddleware,
  tenantMiddleware,
  getMaskedTwilioNumbers
);

export default router;