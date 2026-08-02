import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { tenantMiddleware } from "../../middleware/tenant";
import {
  createInvoice,
  getInvoice,
  listInvoices,
  updateInvoice,
  deleteInvoice,
} from "./invoice.controller";

const router = Router();

router.get("/", authMiddleware, tenantMiddleware, listInvoices);
router.post("/", authMiddleware, tenantMiddleware, createInvoice);
router.get("/:id", authMiddleware, tenantMiddleware, getInvoice);
router.put("/:id", authMiddleware, tenantMiddleware, updateInvoice);
router.delete("/:id", authMiddleware, tenantMiddleware, deleteInvoice);

export default router;
