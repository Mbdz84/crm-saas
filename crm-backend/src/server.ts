import { config } from "dotenv";
config();

import app from "./app";
import cron from "node-cron";
import { processJobReminders } from "./modules/reminders/reminder.cron";

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 CRM Backend running on port ${PORT}`);

  // ⏰ Reminder cron — every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    await processJobReminders();
  });

  console.log("⏰ Reminder cron scheduled (every 10 minutes)");
});