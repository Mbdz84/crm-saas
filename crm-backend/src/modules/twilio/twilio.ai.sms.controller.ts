import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { nanoid } from "nanoid";
import { parseTextWithAI } from "../jobs/actions/parse.helper";

/* ============================================================
   INCOMING SMS → PARSE → CREATE JOB
============================================================ */
export async function incomingSms(req: Request, res: Response) {
  const fromRaw = req.body?.From || req.body?.from;
  const bodyRaw = req.body?.Body || req.body?.body;

  const from = normalizePhone(fromRaw);
  const body = bodyRaw?.trim();

  if (!from || !body) {
    console.warn("⚠️ Incoming SMS missing data", req.body);
    return res.type("text/xml").send("<Response></Response>");
  }

  // 🔍 Match Lead Source by SMS sender number
  const leadSource = await prisma.leadSource.findFirst({
    where: {
      incomingSmsNumbers: { has: from },
    },
  });

  let companyId: string;
  let leadSourceId: string | null = null;

  if (leadSource) {
    companyId = leadSource.companyId;
    leadSourceId = leadSource.id;
  } else {
    const company = await prisma.company.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!company) {
      console.error("❌ No company found for incoming SMS");
      return res.type("text/xml").send("<Response></Response>");
    }

    companyId = company.id;
  }

  // 🧠 AI PARSE
  let parsed: any = {};
  try {
    parsed = await parseTextWithAI(body);
  } catch (err) {
    console.error("❌ SMS AI parse failed", err);
    parsed = {};
  }

  // 🎯 Resolve Job Type (create if missing)
  let jobTypeId: string | null = null;

  if (parsed.jobType && parsed.jobType.trim()) {
    const existing = await prisma.jobType.findFirst({
      where: {
        companyId,
        name: parsed.jobType,
      },
    });

    if (existing) {
      jobTypeId = existing.id;
    } else {
      const created = await prisma.jobType.create({
        data: {
          companyId,
          name: parsed.jobType.trim(),
          active: true,
        },
      });

      jobTypeId = created.id;
    }
  }

  // 🧾 CREATE JOB
  await prisma.job.create({
    data: {
      shortId: nanoid(6).toUpperCase(),

      title: parsed.jobType || "Incoming SMS Job",
      description: parsed.description || null,

      customerName: parsed.customerName || null,
      customerPhone: parsed.customerPhone || from,
      customerPhone2: parsed.customerPhone2 || null,
      customerAddress: parsed.customerAddress || null,

      jobTypeId,
      companyId,
      sourceId: leadSourceId,
      status: "Accepted",

      logs: {
        createMany: {
          data: [
            {
              type: "incoming_sms",
              text: `Incoming SMS from ${from}`,
            },
            {
              type: "incoming_sms",
              text: body, // FULL RAW SMS
            },
          ],
        },
      },
    },
  });

  return res.type("text/xml").send("<Response></Response>");
}

/* ============================================================
   HELPERS
============================================================ */
function normalizePhone(phone?: string): string | null {
  if (!phone) return null;

  const digits = phone.replace(/[^\d]/g, "");

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+")) return phone;

  return null;
}