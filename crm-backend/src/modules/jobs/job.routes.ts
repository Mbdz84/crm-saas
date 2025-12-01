import { Router } from "express";
import prisma from "../../prisma/client";
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
} from "./index";

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
router.post("/create/from-parsed", CreateController.createJobFromParsed);

/* ------------ ALIAS TO MATCH FRONTEND ---------------------- */
router.post("/create-from-parse", CreateController.createJobFromParsed);

/* --------------- GET ALL JOBS ------------------------------ */
router.get("/", GetController.getJobs);

/* --------------- CREATE JOB -------------------------------- */
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

/* --------------- GET / UPDATE SINGLE JOB -------------------- */
router.get("/:shortId", GetController.getJobByShortId);
router.put("/:shortId", UpdateController.updateJobByShortId);

/* --------------- GET / UPDATE SINGLE JOB -------------------- */
router.get("/:shortId", GetController.getJobByShortId);
router.put("/:shortId", UpdateController.updateJobByShortId);

/* --------------- DELETE JOB -------------------- */
router.delete("/:shortId", DeleteController.deleteJob);



export default router;