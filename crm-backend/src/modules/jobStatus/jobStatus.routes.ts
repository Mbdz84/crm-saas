import { Router } from "express";
import {
  getStatuses,
  createStatus,
  updateStatus,
  deleteStatus,
  reorderStatuses,
  lockStatus,
  unlockStatus
} from "./jobStatus.controller";

import { authMiddleware } from "../../middleware/auth";
import { tenantMiddleware } from "../../middleware/tenant";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, getStatuses);
router.post("/", authMiddleware, tenantMiddleware, createStatus);
router.put("/:id", authMiddleware, tenantMiddleware, updateStatus);
router.delete("/:id", authMiddleware, tenantMiddleware, deleteStatus);

// Drag & Drop sort
router.post("/reorder", authMiddleware, tenantMiddleware, reorderStatuses);

// Lock / unlock status
router.post("/:id/lock", authMiddleware, tenantMiddleware, lockStatus);
router.post("/:id/unlock", authMiddleware, tenantMiddleware, unlockStatus);

export default router;