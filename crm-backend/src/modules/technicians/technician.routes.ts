import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { tenantMiddleware } from "../../middleware/tenant";

import {
  getTechnicians,
  createTechnician,
  updateTechnician,
  toggleTechnicianStatus,
  deleteTechnician,
  getTechnicianById,
  resetPassword, // ✅ IMPORT THIS
} from "./technician.controller";

const router = Router(); // ✅ MUST COME FIRST

// ------------------------------------------------------------
// TECHNICIAN ROUTES
// ------------------------------------------------------------

router.get("/", authMiddleware, tenantMiddleware, getTechnicians);

router.post("/", authMiddleware, tenantMiddleware, createTechnician);

router.get("/:id", authMiddleware, tenantMiddleware, getTechnicianById);

router.put("/:id", authMiddleware, tenantMiddleware, updateTechnician);

router.patch("/:id/toggle", authMiddleware, tenantMiddleware, toggleTechnicianStatus);

router.delete("/:id", authMiddleware, tenantMiddleware, deleteTechnician);

// ✅ RESET PASSWORD ROUTE (correct placement)
router.post(
  "/:id/reset-password",
  authMiddleware,
  tenantMiddleware,
  resetPassword
);

export default router;