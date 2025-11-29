import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { tenantMiddleware } from "../../middleware/tenant";
import {
  getTechnicians,
  createTechnician,
  updateTechnician,
  toggleTechnicianStatus,
  deleteTechnician,
  getTechnicianById
} from "./technician.controller";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, getTechnicians);
router.post("/", authMiddleware, tenantMiddleware, createTechnician);
router.put("/:id", authMiddleware, tenantMiddleware, updateTechnician);
router.patch("/:id/toggle", authMiddleware, tenantMiddleware, toggleTechnicianStatus);
router.delete("/:id", authMiddleware, tenantMiddleware, deleteTechnician);
router.get("/:id", authMiddleware, tenantMiddleware, getTechnicianById);

export default router;