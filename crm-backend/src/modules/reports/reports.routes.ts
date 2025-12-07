import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { tenantMiddleware } from "../../middleware/tenant";
import { getReports } from "./reports.controller";
import { getCanceledJobs } from "./canceled.controller";

const router = Router();

/**
 * /reports   → Closed jobs report
 */
router.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  getReports
);

/**
 * /reports/canceled  → Canceled jobs report
 */
router.get(
  "/canceled",
  authMiddleware,
  tenantMiddleware,
  getCanceledJobs
);

export default router;