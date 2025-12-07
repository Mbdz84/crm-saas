import { Router } from "express";
import {
  ExtensionController,
  ParseController,
  CreateController,
  UpdateController,
  CloseController,
  ReopenController,
  GetController,
  SmsController,
  RecordingsController,
  DeleteController,
  DuplicateController,
} from "./index";
import { createJobFromParse } from "./actions/create-from-parse.controller";
import { authMiddleware } from "../../middleware/auth";
import { tenantMiddleware } from "../../middleware/tenant";

const router = Router();

/* ============================================================
   IMPORTANT: Literal routes BEFORE any :shortId routes
============================================================ */

/* ------------ PARSE SMS (PRIMARY ROUTE) -------------------- */
router.post("/parse/sms", ParseController.parseJobFromText);

/* ------------ PARSE ALIAS: /parse (fallback) --------------- */
/* This allows the frontend to call /jobs/parse safely */
router.post("/parse", ParseController.parseJobFromText);

/* ------------ CREATE FROM PARSED (PRIMARY ROUTE) ----------- */
/* Used by frontend: POST /jobs/create-from-parse */
router.post(
  "/create-from-parse",
  authMiddleware,
  tenantMiddleware,
  createJobFromParse
);

/* ------------ OPTIONAL ALIAS ------------------------------- */
/* If anything still calls /jobs/create/from-parsed, it will work too */
router.post(
  "/create/from-parsed",
  authMiddleware,
  tenantMiddleware,
  createJobFromParse
);

/* --------------- GET ALL JOBS ------------------------------ */
router.get("/", GetController.getJobs);

/* --------------- CREATE JOB (manual form) ------------------ */
router.post("/", CreateController.createJob);

/* --------------- EXTENSIONS -------------------------------- */
router.post("/:shortId/refresh-extension", ExtensionController.refreshExtension);

/* --------------- CLOSING / REOPEN --------------------------- */
router.post("/:shortId/close", CloseController.closeJob);
router.post("/:shortId/reopen", ReopenController.reopenJob);

/* --------------- SMS ---------------------------------------- */
router.post("/:shortId/resend-sms", SmsController.resendJobSms);

/* --------------- RECORDINGS --------------------------------- */
router.get("/:shortId/recordings", RecordingsController.getJobRecordings);

/* --------------- DUPLICATE JOB BUTTON ----------------------- */
router.post("/:shortId/duplicate", DuplicateController.duplicateJob);

/* --------------- GET / UPDATE SINGLE JOB -------------------- */
router.get("/:shortId", GetController.getJobByShortId);
router.put("/:shortId", UpdateController.updateJobByShortId);

/* --------------- DELETE JOB -------------------------------- */
router.delete("/:shortId", DeleteController.deleteJob);

export default router;