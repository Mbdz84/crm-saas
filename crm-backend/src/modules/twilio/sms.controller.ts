import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { nanoid } from "nanoid";

export async function incomingSms(req: Request, res: Response) {
  const from = normalizePhone(req.body.From);
  const body = req.body.Body?.trim();

  if (!from || !body) {
    return res.send("<Response></Response>");
  }

  // ✅ FIX: include company + correct where
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

  const companyId = leadSource?.companyId;

  if (!companyId) {
    // fallback → no lead source
    const company = await prisma.company.findFirst({
  orderBy: { createdAt: "asc" }, // deterministic
});
    if (!company) return res.send("<Response></Response>");

    await createJob({
      companyId: company.id,
      leadSourceId: null,
      from,
      body,
    });

    return res.send("<Response></Response>");
  }

  await createJob({
    companyId,
    leadSourceId: leadSource.id,
    from,
    body,
  });

  res.send("<Response></Response>");
}

/* ============================
   HELPERS
============================ */

function normalizePhone(phone?: string) {
  if (!phone) return null;
  function normalizePhone(phone?: string) {
  if (!phone) return null;

  const digits = phone.replace(/[^\d]/g, "");

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+")) return phone;

  return null;
}
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