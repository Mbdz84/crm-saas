import { Router } from "express";
import { runReminders } from "./cron.controller";

const router = Router();

// Triggered by Supabase pg_cron (secret-header protected)
router.post("/run-reminders", runReminders);

export default router;
