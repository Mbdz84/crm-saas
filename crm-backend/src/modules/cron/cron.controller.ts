import { Request, Response } from "express";
import { processJobReminders } from "../reminders/reminder.cron";

/**
 * POST /cron/run-reminders
 * Triggered by an external scheduler (Supabase pg_cron). Protected by a
 * shared secret header so only the scheduler can invoke it.
 */
export async function runReminders(req: Request, res: Response) {
  const secret = process.env.CRON_SECRET;
  const provided = req.header("x-cron-secret");

  if (!secret || provided !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Run in the background; ack the scheduler immediately.
  processJobReminders().catch((err) =>
    console.error("🔥 runReminders error:", err)
  );

  return res.json({ ok: true, startedAt: new Date().toISOString() });
}
