import { config } from "dotenv";
config();

import app from "./app";

const PORT = process.env.PORT || 8080;

// NOTE: Reminders are no longer run by in-process node-cron (unreliable on
// Cloud Run — the timer dies when the instance scales to zero). They are now
// triggered by Supabase pg_cron → POST /cron/run-reminders.
app.listen(PORT, () => {
  console.log(`🚀 CRM Backend running on port ${PORT}`);
});