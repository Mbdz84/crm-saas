import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { tenantMiddleware } from "../../middleware/tenant";
import {
  updateCompany,
  uploadLogo,
  getCompany,
} from "./settings.controller";
import { upload } from "../../lib/multer";

const router = Router();

// Get current company profile
router.get("/me", authMiddleware, tenantMiddleware, getCompany);

// Update company info
router.put("/", authMiddleware, tenantMiddleware, updateCompany);

// Upload logo
router.post(
  "/logo",
  authMiddleware,
  tenantMiddleware,
  upload.single("logo"),
  uploadLogo
);

export default router;