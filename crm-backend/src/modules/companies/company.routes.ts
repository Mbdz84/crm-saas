import { Router } from "express";
import { getCompany, updateCompany } from "./company.controller";
import { authMiddleware } from "../../middleware/auth";

const router = Router();

router.get("/me", authMiddleware, getCompany);
router.put("/update", authMiddleware, updateCompany);

export default router;