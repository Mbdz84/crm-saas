import { Request, Response } from "express";
import prisma from "../../prisma/client";
import bcrypt from "bcryptjs";
import twilio from "twilio";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);
/* ----------------------------------------
   Helper: Normalize phone to E.164 (+1...)
-----------------------------------------*/
function normalizePhone(raw: any): string | null {
  if (!raw) return null;

  let phone = String(raw).trim();

  // If already starts with + and digits → trust it
  if (/^\+\d{8,15}$/.test(phone)) {
    return phone;
  }

  // Strip all non-digits
  const digits = phone.replace(/\D/g, "");

  // US logic:
  // 10 digits → assume US, prepend +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // 11 digits starting with 1 → treat as US
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // Fallback: just prefix +
  return `+${digits}`;
}

/* ------------------------------
   GET ALL TECHNICIANS
--------------------------------*/
export async function getTechnicians(req: any, res: Response) {
  try {
    const companyId = req.user.companyId;

    const techs = await prisma.user.findMany({
      where: {
        companyId,
        role: "technician", // ✅ use "technician"
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        active: true,
        receiveSms: true,
        maskedCalls: true,
        maskedTwilioNumberSid: true,
        maskedTwilioPhoneNumber: true,
        payrollEnabled: true,
        canSeeClosing: true,
        canViewAllJobs: true,
        defaultTechPercent: true,
      },
    });

    return res.json(techs);      // ✅ send a plain array
  } catch (err) {
    console.error("getTechnicians error:", err);
    return res.status(500).json({ error: "Failed to load technicians" });
  }
}

/* ------------------------------
   GET TECHNICIAN BY ID
--------------------------------*/
export async function getTechnicianById(req: any, res: Response) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const tech = await prisma.user.findFirst({
      where: {
        id,
        companyId,
        role: "technician", // ✅ ensure it's actually a technician
      },
    });

    if (!tech) return res.status(404).json({ error: "Technician not found" });

    return res.json({ tech });
  } catch (err) {
    console.error("getTechnicianById error:", err);
    return res.status(500).json({ error: "Failed to load technician" });
  }
}

/* ------------------------------
   CREATE TECHNICIAN
--------------------------------*/
export async function createTechnician(req: any, res: Response) {
  try {
    const companyId = req.user.companyId;
    const {
      name,
      email,
      phone,
      password,
      role,

      active,
      receiveSms,
      maskedCalls,
      payrollEnabled,
      canSeeClosing,
      canViewAllJobs,

      defaultTechPercent,
      defaultPartsResponsibility,
      defaultTechPaysExtraFee,
      defaultCcFeePercent,
      defaultCheckFeePercent,

      canAdjustPercentages,
      canAdjustParts,
      canAdjustFees,

      availability,
    } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    // ✅ hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const tech = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: normalizePhone(phone),
        role: role || "technician", // ✅ default to "technician"

        active: active ?? true,
        receiveSms: receiveSms ?? true,
        maskedCalls: maskedCalls ?? false,
        payrollEnabled: payrollEnabled ?? false,
        canSeeClosing: canSeeClosing ?? true,
        canViewAllJobs: canViewAllJobs ?? true,

        defaultTechPercent: defaultTechPercent ?? null,
        defaultPartsResponsibility: defaultPartsResponsibility || null,
        defaultTechPaysExtraFee: defaultTechPaysExtraFee ?? false,
        defaultCcFeePercent: defaultCcFeePercent ?? null,
        defaultCheckFeePercent: defaultCheckFeePercent ?? null,

        canAdjustPercentages: canAdjustPercentages ?? false,
        canAdjustParts: canAdjustParts ?? false,
        canAdjustFees: canAdjustFees ?? false,

        availability: availability ?? null,

        companyId,
      },
    });

    return res.json({ tech });
  } catch (err) {
    console.error("createTechnician error:", err);
    return res.status(500).json({ error: "Failed to create technician" });
  }
}

/* ------------------------------
   UPDATE TECHNICIAN
--------------------------------*/
export async function updateTechnician(req: any, res: Response) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const existing = await prisma.user.findFirst({
      where: { id, companyId, role: "technician" },
    });

    if (!existing) {
      return res.status(404).json({ error: "Technician not found" });
    }

    const body = req.body || {};

    // ✅ whitelist only fields we allow to update
    const allowed: any = {
      name: body.name,
      email: body.email, // if you want to allow email change
      phone: body.phone !== undefined ? normalizePhone(body.phone) : undefined,

      active: body.active,
      receiveSms: body.receiveSms,
      maskedCalls: body.maskedCalls,
      payrollEnabled: body.payrollEnabled,
      canSeeClosing: body.canSeeClosing,
      canViewAllJobs: body.canViewAllJobs,

      defaultTechPercent: body.defaultTechPercent,
      defaultPartsResponsibility: body.defaultPartsResponsibility,
      defaultTechPaysExtraFee: body.defaultTechPaysExtraFee,
      defaultCcFeePercent: body.defaultCcFeePercent,
      defaultCheckFeePercent: body.defaultCheckFeePercent,

      canAdjustPercentages: body.canAdjustPercentages,
      canAdjustParts: body.canAdjustParts,
      canAdjustFees: body.canAdjustFees,

      availability: body.availability,
    };

    // Remove keys that are undefined → don’t override with undefined
    const data = Object.fromEntries(
      Object.entries(allowed).filter(([, v]) => v !== undefined)
    );

const allowedFields: any = {};
const f = req.body;

// Basic info
if (f.name !== undefined) allowedFields.name = f.name;
if (f.phone !== undefined) allowedFields.phone = f.phone;
if (f.active !== undefined) allowedFields.active = Boolean(f.active);

// Toggles
if (f.receiveSms !== undefined) allowedFields.receiveSms = Boolean(f.receiveSms);
if (f.maskedCalls !== undefined) allowedFields.maskedCalls = Boolean(f.maskedCalls);
if (f.maskedTwilioNumberSid !== undefined) {
  allowedFields.maskedTwilioNumberSid = f.maskedTwilioNumberSid || null;

  if (f.maskedTwilioNumberSid) {
    const num = await twilioClient
      .incomingPhoneNumbers(f.maskedTwilioNumberSid)
      .fetch();

    allowedFields.maskedTwilioPhoneNumber = num.phoneNumber; // +E164
  } else {
    allowedFields.maskedTwilioPhoneNumber = null;
  }
}if (f.payrollEnabled !== undefined) allowedFields.payrollEnabled = Boolean(f.payrollEnabled);
if (f.canSeeClosing !== undefined) allowedFields.canSeeClosing = Boolean(f.canSeeClosing);
if (f.canViewAllJobs !== undefined) allowedFields.canViewAllJobs = Boolean(f.canViewAllJobs);

// Financial defaults
if (f.defaultTechPercent !== undefined) allowedFields.defaultTechPercent = f.defaultTechPercent;
if (f.defaultPartsResponsibility !== undefined) allowedFields.defaultPartsResponsibility = f.defaultPartsResponsibility;
if (f.defaultTechPaysExtraFee !== undefined) allowedFields.defaultTechPaysExtraFee = Boolean(f.defaultTechPaysExtraFee);
if (f.defaultCcFeePercent !== undefined) allowedFields.defaultCcFeePercent = f.defaultCcFeePercent;
if (f.defaultCheckFeePercent !== undefined) allowedFields.defaultCheckFeePercent = f.defaultCheckFeePercent;

// Adjustment permissions
if (f.canAdjustPercentages !== undefined) allowedFields.canAdjustPercentages = Boolean(f.canAdjustPercentages);
if (f.canAdjustParts !== undefined) allowedFields.canAdjustParts = Boolean(f.canAdjustParts);
if (f.canAdjustFees !== undefined) allowedFields.canAdjustFees = Boolean(f.canAdjustFees);

// AVAILABILITY
if (f.availability !== undefined) allowedFields.availability = f.availability;

const tech = await prisma.user.update({
  where: { id, companyId },
  data: allowedFields,
});

    return res.json({ tech });
  } catch (err) {
    console.error("updateTechnician error:", err);
    return res.status(500).json({ error: "Failed to update technician" });
  }
}

/* ------------------------------
   SOFT DELETE / DISABLE
--------------------------------*/
export async function deleteTechnician(req: any, res: Response) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const tech = await prisma.user.findFirst({
      where: { id, companyId, role: "technician" },
    });

    if (!tech) {
      return res.status(404).json({ error: "Technician not found" });
    }

    await prisma.user.update({
      where: { id },
      data: { active: false },
    });

    return res.json({ message: "Technician disabled" });
  } catch (err) {
    console.error("deleteTechnician error:", err);
    return res.status(500).json({ error: "Failed to disable technician" });
  }
}

/* ------------------------------
   reset button
--------------------------------*/

export async function resetPassword(req: any, res: Response) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { password } = req.body;

    const tech = await prisma.user.findFirst({
      where: { id, companyId }
    });

    if (!tech) {
      return res.status(404).json({ error: "Technician not found" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashed }
    });

    return res.json({ message: "Password updated" });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ error: "Failed to reset password" });
  }
}

/* ------------------------------
   TOGGLE ACTIVE/INACTIVE
--------------------------------*/
export async function toggleTechnicianStatus(req: any, res: Response) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const tech = await prisma.user.findFirst({
      where: { id, companyId, role: "technician" },
    });

    if (!tech) {
      return res.status(404).json({ error: "Technician not found" });
    }

    const newStatus = !tech.active;

    await prisma.user.update({
      where: { id },
      data: { active: newStatus },
    });

    return res.json({ message: "Status updated", active: newStatus });
  } catch (err) {
    console.error("toggleTechnicianStatus error:", err);
    return res.status(500).json({ error: "Failed to toggle technician" });
  }
}