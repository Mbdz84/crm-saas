import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { tenantMiddleware } from "../../middleware/tenant";
import {
  settleReport,
  listSettlements,
  settlementStatus,
  updateSettlement,
  addManualSettlement,
} from "./settlements.controller";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, listSettlements);
router.get("/status", authMiddleware, tenantMiddleware, settlementStatus);
router.post("/settle", authMiddleware, tenantMiddleware, settleReport);
router.post("/manual", authMiddleware, tenantMiddleware, addManualSettlement);
router.patch("/:id", authMiddleware, tenantMiddleware, updateSettlement);

export default router;
