// crm-backend/src/app.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import logoutRoutes from "./modules/auth/logout.routes";
import ingestRoutes from "./modules/ingest/ingest.routes";
import twilioSmsRoutes from "./modules/twilio/sms.routes";

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
import invoiceRoutes from "./modules/invoices/invoice.routes";
import jobStatusRoutes from "./modules/jobStatus/jobStatus.routes";
import smsSettingsRouter from "./modules/smsSettings/smsSettings.routes";
import systemRouter from "./modules/system/system.routes";

import reportsRoutes from "./modules/reports/reports.routes";
import messagesRoutes from "./modules/messages/messages.routes";
import pushRoutes from "./modules/push/push.routes";
import callerIdRoutes from "./modules/callerIds/callerId.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import settlementRoutes from "./modules/settlements/settlements.routes";
import cronRoutes from "./modules/cron/cron.routes";

import { authMiddleware } from "./middleware/auth";
import { tenantMiddleware } from "./middleware/tenant";

const app = express();

/* ============================================================
   GLOBAL MIDDLEWARE
============================================================ */

// 1️⃣ Twilio sends x-www-form-urlencoded — MUST BE FIRST
app.use(bodyParser.urlencoded({ extended: false }));

// 2️⃣ JSON + cookies
app.use(bodyParser.json());
app.use(cookieParser());

// 3️⃣ CORS
app.use(
  cors({
    origin: [
      "https://app.moriel.work",
      "https://www.app.moriel.work",
      "http://localhost:3000",
    ],
    credentials: true,
  })
);

/* ============================================================
   TWILIO ROUTES
============================================================ */
app.use("/twilio", twilioSmsRoutes);
app.use("/twilio", twilioVoiceRoutes);

app.options("*", cors());

// ingest incoming json for job create
app.use("/api/ingest", ingestRoutes);

// logout
app.use("/logout", logoutRoutes);

// external scheduler (Supabase pg_cron) → reminders; secret-protected inside
app.use("/cron", cronRoutes);

// Request logging
app.use(requestLogger);

// Static uploads path
app.use("/uploads", express.static("uploads"));


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
app.use("/system", authMiddleware, tenantMiddleware, systemRouter);
app.use("/job-status", jobStatusRoutes);
app.use("/job-types", authMiddleware, tenantMiddleware, jobTypeRoutes);
// PUBLIC (no auth needed)
app.use("/lead-sources", leadSourceRoutes);
app.use("/invoices", authMiddleware, tenantMiddleware, invoiceRoutes);
app.use("/sms-settings", authMiddleware, tenantMiddleware, smsSettingsRouter);
app.use("/reports", reportsRoutes);
app.use("/messages", authMiddleware, tenantMiddleware, messagesRoutes);
app.use("/push", authMiddleware, tenantMiddleware, pushRoutes);
app.use("/caller-ids", authMiddleware, tenantMiddleware, callerIdRoutes);
app.use("/dashboard", authMiddleware, tenantMiddleware, dashboardRoutes);
app.use("/settlements", authMiddleware, tenantMiddleware, settlementRoutes);

/* ============================================================
   HEALTH CHECK
============================================================ */
app.get("/", (_, res) => {
  res.send("CRM API is running 🚀");
});

export default app;
