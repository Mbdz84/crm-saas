import { Router } from "express";
import {
  getCallerIds,
  createCallerId,
  updateCallerId,
  deleteCallerId,
} from "./callerId.controller";

const router = Router();

router.get("/", getCallerIds);
router.post("/", createCallerId);
router.put("/:id", updateCallerId);
router.delete("/:id", deleteCallerId);

export default router;
