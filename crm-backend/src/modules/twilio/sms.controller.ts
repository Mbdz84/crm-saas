import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { nanoid } from "nanoid";

export async function incomingSms(req: Request, res: Response) {
  // 🔒 SAFE extraction for Twilio (form-urlencoded)
  const fromRaw =
    req.body?.From ||
    (req as any).body?.From ||
    req.body?.from;

  const bodyRaw =
    req.body?.Body ||
    (req as any).body?.Body ||
    req.body?.body;

  const from = normalizePhone(fromRaw);
  const body = bodyRaw?.trim();

  if (!from || !body) {
    console.warn("⚠️ Incoming SMS missing data", req.body);
    return res.type("text/xml").send("<Response></Response>");
  }

  // 🔍 Match Lead Source by incoming SMS number
  const leadSource = await prisma.leadSource.findFirst({
    where: {
      incomingSmsNumbers: {
        has: from,
      },
    },
    include: {
      company: true,
    },
  });

  let companyId: string;
  let leadSourceId: string | null = null;

  if (leadSource) {
    companyId = leadSource.companyId;
    leadSourceId = leadSource.id;
  } else {
    // 🧯 Fallback company (oldest company = default)
    const company = await prisma.company.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!company) {
      console.error("❌ No company found for incoming SMS");
      return res.type("text/xml").send("<Response></Response>");
    }

    companyId = company.id;
  }

  await createJob({
    companyId,
    leadSourceId,
    from,
    body,
  });

  // ✅ ALWAYS respond XML to Twilio
  return res.type("text/xml").send("<Response></Response>");
}

/* ============================
   HELPERS
============================ */

function normalizePhone(phone?: string): string | null {
  if (!phone) return null;

  const digits = phone.replace(/[^\d]/g, "");

  // US standard handling
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  // Already E.164
  if (phone.startsWith("+")) return phone;

  return null;
}

async function createJob({
  companyId,
  leadSourceId,
  from,
  body,
}: {
  companyId: string;
  leadSourceId: string | null;
  from: string;
  body: string;
}) {
  await prisma.job.create({
    data: {
      shortId: nanoid(6).toUpperCase(),
      title: "Incoming SMS Job",
      description: body,
      customerPhone: from,
      companyId,
      sourceId: leadSourceId,
      status: "Accepted",
      logs: {
        create: {
          type: "ai_generated",
          text: leadSourceId
            ? `Job created from incoming SMS (${from})`
            : `Incoming SMS from ${from} — NO lead source matched`,
        },
      },
    },
  });
}