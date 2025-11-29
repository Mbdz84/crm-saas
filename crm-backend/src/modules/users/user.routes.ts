import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { tenantMiddleware } from "../../middleware/tenant";

import {
  getUsers,
  createUser,
  createTechnician,
  toggleTechnician,
  deleteTechnician,
  getTechnician,
  getUserById,
  updateUser
} from "./user.controller";

const router = Router();

// GET all users
router.get("/", authMiddleware, tenantMiddleware, getUsers);

// CREATE user (missing route!)
router.post("/", authMiddleware, tenantMiddleware, createUser);

// TECHNICIANS
router.post("/technicians", authMiddleware, tenantMiddleware, createTechnician);
router.get("/technicians/:id", authMiddleware, tenantMiddleware, getTechnician);
router.delete("/technicians/:id", authMiddleware, tenantMiddleware, deleteTechnician);

// USER PROFILE
router.get("/:id", authMiddleware, tenantMiddleware, getUserById);
router.put("/:id", authMiddleware, tenantMiddleware, updateUser);

export default router;