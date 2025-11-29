import { Router } from "express";
import {
  getJobTypes,
  createJobType,
  updateJobType,
  deleteJobType,
} from "./jobType.controller";

const router = Router();

router.get("/", getJobTypes);
router.post("/", createJobType);
router.put("/:id", updateJobType);
router.delete("/:id", deleteJobType);

export default router;