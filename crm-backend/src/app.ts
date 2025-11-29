import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import logoutRoutes from "./modules/auth/logout.routes";

// Logging middleware
import { requestLogger } from "./middleware/requestLogger";

// TWILIO (must come AFTER bodyParser.urlencoded)
import twilioVoiceRoutes from "./modules/twilio/voice.routes";

// ROUTES
import authRoutes from "./modules/auth/auth.routes";
import companyRoutes from "./modules/companies/company.routes";
import userRoutes from "./modules/users/user.routes";
import jobRoutes from "./modules/jobs/job.routes";
import technicianRoutes from "./modules/technicians/technician.routes";
import settingsRoutes from "./modules/settings/settings.routes";
import jobTypeRoutes from "./modules/jobTypes/jobType.routes";
import leadSourceRoutes from "./modules/leadSources/leadSource.routes";
import jobStatusRoutes from "./modules/jobStatus/jobStatus.routes";
import smsSettingsRouter from "./modules/smsSettings/smsSettings.routes";

import reportsRoutes from "./modules/reports/reports.routes";

import { authMiddleware } from "./middleware/auth";
import { tenantMiddleware } from "./middleware/tenant";

const app = express();

/* ============================================================
   GLOBAL MIDDLEWARE
============================================================ */

// Twilio sends x-www-form-urlencoded — MUST BE FIRST
app.use(bodyParser.urlencoded({ extended: false }));

// JSON + cookies
app.use(bodyParser.json());
app.use(cookieParser());

// CORS
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

// logout
app.use("/logout", logoutRoutes);

// Request logging
app.use(requestLogger);

// Static uploads path
app.use("/uploads", express.static("uploads"));

/* ============================================================
   TWILIO ROUTES — must come AFTER urlencoded()
============================================================ */
app.use("/twilio", twilioVoiceRoutes);

/* ============================================================
   PUBLIC ROUTES
============================================================ */
app.use("/auth", authRoutes);

/* ============================================================
   PROTECTED ROUTES
============================================================ */
app.use("/companies", authMiddleware, companyRoutes);
app.use("/users", authMiddleware, tenantMiddleware, userRoutes);
app.use("/jobs", authMiddleware, tenantMiddleware, jobRoutes);
app.use("/technicians", authMiddleware, tenantMiddleware, technicianRoutes);
app.use("/settings", authMiddleware, tenantMiddleware, settingsRoutes);
app.use("/job-status", jobStatusRoutes);
app.use("/job-types", authMiddleware, tenantMiddleware, jobTypeRoutes);
app.use("/lead-sources", authMiddleware, tenantMiddleware, leadSourceRoutes);
app.use("/sms-settings", authMiddleware, tenantMiddleware, smsSettingsRouter);
app.use("/reports", reportsRoutes);

/* ============================================================
   HEALTH CHECK
============================================================ */
app.get("/", (_, res) => {
  res.send("CRM API is running 🚀");
});

/* ============================================================
   OPENAI TEST
============================================================ */
app.get("/test-openai", async (req, res) => {
  try {
    const client = new (require("openai")).OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const r = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: "Say OK" }],
    });

    res.send(r.choices?.[0]?.message?.content || "No content returned");
  } catch (err: unknown) {
    res.status(500).send("OpenAI test failed");
  }
});

export default app;