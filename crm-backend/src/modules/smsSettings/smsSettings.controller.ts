// crm-backend/src/modules/smsSettings/smsSettings.controller.ts

import { Request, Response } from "express";
import prisma from "../../prisma/client";

/* ======================================================================================
   Option A – SMS SETTINGS TYPES (JSON Safe)
====================================================================================== */

export type SmsFieldKey =
  | "id"
  | "name"
  | "phone"
  | "address"
  | "jobType"
  | "notes"
  | "appointment"
  | "leadSource"
  | "custom1"
  | "custom2";

export interface SmsSettings {
  order: SmsFieldKey[];
  show: Record<SmsFieldKey, boolean>;
  showLabel: Record<SmsFieldKey, boolean>;
  label: Record<SmsFieldKey, string>;
}

/* ======================================================================================
   DEFAULT SETTINGS
====================================================================================== */

export const defaultSmsSettings: SmsSettings = {
  order: [
    "leadSource",
    "id",
    "name",
    "phone",
    "address",
    "jobType",
    "notes",
    "appointment",
    "custom1",
    "custom2",
  ],

  show: {
    leadSource: true,
    id: true,
    name: true,
    phone: true,
    address: true,
    jobType: true,
    notes: true,
    appointment: true,
    custom1: false,
    custom2: false,
  },

  showLabel: {
    leadSource: true,
    id: true,
    name: true,
    phone: true,
    address: true,
    jobType: true,
    notes: true,
    appointment: true,
    custom1: false,
    custom2: false,
  },

  label: {
    leadSource: "Source",
    id: "Job ID",
    name: "Name",
    phone: "Phone",
    address: "Address",
    jobType: "Job",
    notes: "Notes",
    appointment: "APP",
    custom1: "",
    custom2: "",
  },
};

// Custom free-text fields: the "label" holds the text the user typed,
// which is inserted into the SMS as-is (not pulled from the job record).
export const CUSTOM_SMS_KEYS: SmsFieldKey[] = ["custom1", "custom2"];

/* ======================================================================================
   HELPER — Convert flat req.body → structured show/showLabel/label
====================================================================================== */

function convertIncoming(input: any): SmsSettings {
  const base = JSON.parse(JSON.stringify(defaultSmsSettings)) as SmsSettings;

  // ORDER
  if (Array.isArray(input.order)) {
    const validKeys = Object.keys(base.show) as SmsFieldKey[];
    const filtered = input.order.filter((k: any) => validKeys.includes(k));
    if (filtered.length > 0) base.order = filtered;
  }

  // SHOW / SHOWLABEL / LABEL TEXT
  for (const key of Object.keys(base.show) as SmsFieldKey[]) {
    // Example incoming:
    //   showId → input["id"]
    //   label_id → input["label_id"]
    //   labelText_id → input["labelText_id"]

    base.show[key] = Boolean(input[key]);
    base.showLabel[key] = Boolean(input[`label_${key}`]);

    if (typeof input[`labelText_${key}`] === "string") {
      base.label[key] = input[`labelText_${key}`];
    }
  }

  return base;
}

/* ======================================================================================
   GET SETTINGS
====================================================================================== */
export async function getSmsSettings(req: Request, res: Response) {
  console.log("📩 /sms-settings called");
  console.log("📩 cookies:", req.cookies);
  console.log("📩 user from authMiddleware:", req.user);

  try {
    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
    });

    console.log("📩 RAW DB smsSettings:", company?.smsSettings);

    // If nothing saved → return default
    if (!company?.smsSettings) {
      console.log("📩 Returning DEFAULT SMS settings");
      return res.json(defaultSmsSettings);
    }

    const db = company.smsSettings as any;

    // Normalize structure
    const normalized = {
      order: [...(db.order || defaultSmsSettings.order)],
      show: { ...(db.show || defaultSmsSettings.show) },
      showLabel: { ...(db.showLabel || {}) },  // might not exist yet
      label: { ...(db.label || db.labels || defaultSmsSettings.label) },
    };

    // Back-fill custom fields for settings saved before they existed
    for (const key of CUSTOM_SMS_KEYS) {
      if (!normalized.order.includes(key)) normalized.order.push(key);
      if (normalized.show[key] === undefined) normalized.show[key] = false;
      if (normalized.showLabel[key] === undefined) normalized.showLabel[key] = false;
      if (normalized.label[key] === undefined) normalized.label[key] = "";
    }

    // Ensure showLabel has entries
    for (const key of normalized.order) {
      if (normalized.showLabel[key] === undefined) {
        normalized.showLabel[key] = true; // default
      }
    }

    console.log("📩 RETURNING NORMALIZED SETTINGS:", normalized);

    return res.json(normalized);
  } catch (err) {
    console.error("🔥 GET SMS SETTINGS ERROR:", err);
    return res.status(500).json({ error: "Failed to load SMS settings" });
  }
}

/* ======================================================================================
   UPDATE SETTINGS
====================================================================================== */
export async function updateSmsSettings(req: Request, res: Response) {
  try {
    const normalized = convertIncoming(req.body);

    await prisma.company.update({
      where: { id: req.user!.companyId },
      data: {
        smsSettings: normalized as any, // JSON-safe
      },
    });

    return res.json({ message: "SMS settings updated", settings: normalized });
  } catch (err) {
    console.error("🔥 UPDATE SMS SETTINGS ERROR:", err);
    return res.status(500).json({ error: "Failed to update SMS settings" });
  }
}