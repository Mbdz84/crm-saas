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
} from "./index";

const router = Router();

/* ============================================================
   FIX: Always put literal routes BEFORE parameter routes
============================================================ */

/* ------------ PARSE SMS + CREATE PARSED JOB --------------- */
router.post("/parse/sms", ParseController.parseJobFromText);
router.post("/create/from-parsed", CreateController.createJobFromParsed);

/* --------------- GET ALL JOBS ----------------------------- */
router.get("/", GetController.getJobs);

/* --------------- CREATE JOB ------------------------------- */
router.post("/", CreateController.createJob);

/* --------------- EXTENSIONS ------------------------------- */
router.post("/:shortId/refresh-extension", ExtensionController.refreshExtension);

/* --------------- CLOSING / REOPEN -------------------------- */
router.post("/:shortId/close", CloseController.closeJob);
router.post("/:shortId/reopen", ReopenController.reopenJob);

/* --------------- SMS --------------------------------------- */
router.post("/:shortId/resend-sms", SmsController.resendJobSms);

/* --------------- RECORDINGS -------------------------------- */
router.get("/:shortId/recordings", RecordingsController.getJobRecordings);

/* --------------- GET / UPDATE SINGLE JOB ------------------- */
router.get("/:shortId", GetController.getJobByShortId);
router.put("/:shortId", UpdateController.updateJobByShortId);

export default router;