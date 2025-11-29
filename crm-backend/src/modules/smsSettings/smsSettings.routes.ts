import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { tenantMiddleware } from "../../middleware/tenant";

import {
  getSmsSettings,
  updateSmsSettings,
} from "./smsSettings.controller";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, getSmsSettings);
router.put("/", authMiddleware, tenantMiddleware, updateSmsSettings);

export default router;