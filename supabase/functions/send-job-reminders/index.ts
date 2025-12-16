// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─────────────────────────────────────────────
// ENV
// ─────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_NUMBER = Deno.env.get("TWILIO_NUMBER")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─────────────────────────────────────────────
// TWILIO HELPER
// ─────────────────────────────────────────────
async function sendSms(to: string, body: string) {
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: TWILIO_NUMBER,
        Body: body,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
}

// ─────────────────────────────────────────────
// EDGE FUNCTION
// ─────────────────────────────────────────────
serve(async () => {
  const now = new Date().toISOString();

  // 1️⃣ fetch reminders due (10-min cron safe window)
  const { data: reminders, error } = await supabase
    .from("JobReminder")
    .select(`
      id,
      scheduledFor,
      job:jobId (
        id,
        shortId,
        scheduledAt,
        technician:technicianId (
          phone,
          name
        )
      )
    `)
    .is("sentAt", null)
    .eq("canceled", false)
    .lte("scheduledFor", now)
    .gte(
      "scheduledFor",
      new Date(Date.now() - 15 * 60 * 1000).toISOString()
    );

  if (error) {
    console.error(error);
    return new Response("DB error", { status: 500 });
  }

  for (const r of reminders ?? []) {
    const tech = r.job?.technician;
    if (!tech?.phone) continue;

    const msg = `⏰ Reminder: Job ${r.job.shortId} at ${new Date(
      r.job.scheduledAt
    ).toLocaleString()}`;

    try {
      await sendSms(tech.phone, msg);

      await supabase
        .from("JobReminder")
        .update({ sentAt: new Date().toISOString() })
        .eq("id", r.id);
    } catch (err) {
      console.error("SMS failed:", err);
    }
  }

  return new Response("OK");
});