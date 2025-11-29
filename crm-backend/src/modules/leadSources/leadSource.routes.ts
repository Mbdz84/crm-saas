import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { tenantMiddleware } from "../../middleware/tenant";

import {
  getLeadSources,
  getLeadSourceById,
  createLeadSource,
  updateLeadSource,
  deleteLeadSource,
} from "./leadSource.controller";

const router = Router();

// GET all
router.get("/", authMiddleware, tenantMiddleware, getLeadSources);

// GET single
router.get("/:id", authMiddleware, tenantMiddleware, getLeadSourceById);

// CREATE
router.post("/", authMiddleware, tenantMiddleware, createLeadSource);

// UPDATE
router.put("/:id", authMiddleware, tenantMiddleware, updateLeadSource);

// DELETE
router.delete("/:id", authMiddleware, tenantMiddleware, deleteLeadSource);

export default router;