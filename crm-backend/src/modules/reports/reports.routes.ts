import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { tenantMiddleware } from "../../middleware/tenant";
import { getReports } from "./reports.controller";

const router = Router();

// /reports
router.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  getReports
);

export default router;