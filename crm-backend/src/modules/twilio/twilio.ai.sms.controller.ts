import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { generateUniqueShortId } from "../jobs/utils/shortId";
import { parseTextWithAI } from "../jobs/actions/parse.helper";
import { resolveTimezoneForJob } from "../../utils/timezone";
import { recordInboundSms } from "../messages/messages.controller";

/* ============================================================
   INCOMING SMS
   - Always recorded in the chat inbox.
   - A job is created ONLY when the sender is a registered lead
     source (matched by phone). Unknown senders → chat only, no
     job and no AI call (prevents junk jobs / OpenAI abuse).
============================================================ */
export async function incomingSms(req: Request, res: Response) {
  const fromRaw = req.body?.From || req.body?.from;
  const toRaw = req.body?.To || req.body?.to;
  const bodyRaw = req.body?.Body || req.body?.body;
  const messageSid = req.body?.MessageSid || req.body?.SmsSid || null;

  const from = normalizePhone(fromRaw); // client number (E.164)
  const crmNumber = normalizePhone(toRaw) || process.env.TWILIO_NUMBER || "";
  const body = bodyRaw?.trim() || "";

  // Collect MMS media URLs (NumMedia + MediaUrl0..N)
  const numMedia = parseInt(req.body?.NumMedia || "0", 10) || 0;
  const mediaUrls: string[] = [];
  for (let i = 0; i < numMedia; i++) {
    const u = req.body?.[`MediaUrl${i}`];
    if (u) mediaUrls.push(u);
  }

  if (!from || (!body && mediaUrls.length === 0)) {
    console.warn("⚠️ Incoming SMS missing data", req.body);
    return res.type("text/xml").send("<Response></Response>");
  }

  // 🔍 Match Lead Source by SMS sender number.
  // Compare on the LAST 10 DIGITS so the saved format (+1, dashes, parens,
  // with/without country code) never breaks matching.
  const fromLast10 = last10(from);

  const smsLeadSources = fromLast10
    ? await prisma.leadSource.findMany({
        where: { incomingSmsNumbers: { isEmpty: false } },
      })
    : [];

  const candidates = smsLeadSources.filter((ls) =>
    ls.incomingSmsNumbers.some((n) => last10(n) === fromLast10)
  );

  // If several lead sources share the same office number, pick the one whose
  // name appears in the SMS text — their template puts the lead-source name on
  // top of the message. A single match is used directly.
  let leadSource: (typeof candidates)[number] | null = null;

  if (candidates.length === 1) {
    leadSource = candidates[0];
  } else if (candidates.length > 1) {
    const bodyLc = body.toLowerCase();
    leadSource =
      candidates.find((ls) => bodyLc.includes(ls.name.trim().toLowerCase())) ||
      null;

    if (!leadSource) {
      console.warn(
        "⚠️ Multiple lead sources share this number and no name matched the SMS text; using the first.",
        { from, candidates: candidates.map((c) => c.name) }
      );
      leadSource = candidates[0];
    }
  }

  // Determine which company this conversation belongs to
  let companyId: string;
  let leadSourceId: string | null = null;

  if (leadSource) {
    companyId = leadSource.companyId;
    leadSourceId = leadSource.id;
  } else {
    // Non-lead-source SMS → route to the configured CRM company.
    // Falls back to the oldest company only if SMS_DEFAULT_COMPANY_ID is unset.
    const configuredId = process.env.SMS_DEFAULT_COMPANY_ID;
    const company = configuredId
      ? await prisma.company.findUnique({ where: { id: configuredId } })
      : await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });

    if (!company) {
      console.error(
        "❌ No company for incoming SMS (check SMS_DEFAULT_COMPANY_ID)"
      );
      return res.type("text/xml").send("<Response></Response>");
    }

    companyId = company.id;
  }

  // 💬 Always record the message into the chat inbox
  try {
    await recordInboundSms({
      companyId,
      clientNumber: from,
      crmNumber,
      body,
      mediaUrls,
      twilioSid: messageSid,
      // Known lead-source number → label the conversation with its name
      customerName: leadSource?.name || null,
    });
  } catch (err) {
    console.error("❌ Failed to record inbound SMS to chat", err);
  }

  // 🚫 Not a registered lead source → chat only (no job, no AI parse)
  if (!leadSource) {
    return res.type("text/xml").send("<Response></Response>");
  }

  // 🚫 Real jobs arrive in a lead-source template with a phone line, e.g.
  // "Phone:", "Phone1:", "Phone 2:", or "Ph:" followed by a number.
  // Free-text dispatcher notes ("dropped call cb", "spam", "k") don't have
  // one → those are chat-only (no job, no AI call).
  const looksLikeJob = /\b(phone|ph)\s*\d?\s*:\s*[+(]?\d/i.test(body);
  if (!looksLikeJob) {
    console.log("⏭️ Lead-source SMS without Phone: template — chat only", {
      from,
      preview: body.slice(0, 40),
    });
    return res.type("text/xml").send("<Response></Response>");
  }

  // 🧠 AI PARSE (lead-source path only)
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

  // 🎯 Resolve Accepted status so the job lands correctly on the board
  const acceptedStatus = await prisma.jobStatus.findFirst({
    where: { name: "Accepted", active: true },
  });

  const timezone = await resolveTimezoneForJob(
    companyId,
    parsed.customerAddress,
    null
  );

  // 🧾 CREATE JOB
  await prisma.job.create({
    data: {
      shortId: await generateUniqueShortId(),

      title: parsed.jobType || "Incoming SMS Job",
      description: parsed.description || null,

      customerName: parsed.customerName || null,
      customerPhone: parsed.customerPhone || from,
      customerPhone2: parsed.customerPhone2 || null,
      customerAddress: parsed.customerAddress || null,
      timezone,

      jobTypeId,
      companyId,
      sourceId: leadSourceId,
      status: "Accepted",
      statusId: acceptedStatus?.id ?? null,

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

// Last 10 digits of any phone string — used for format-agnostic matching.
function last10(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
}