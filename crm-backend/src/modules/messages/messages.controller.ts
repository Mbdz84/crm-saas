import { Request, Response } from "express";
import twilio from "twilio";
import prisma from "../../prisma/client";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const BOXES = ["inbox", "blocked", "archive"];

/* ============================================================
   SHARED HELPER — record an inbound SMS into a conversation.
   Called by the Twilio inbound webhook (twilio.ai.sms.controller).
============================================================ */
export async function recordInboundSms(input: {
  companyId: string;
  clientNumber: string; // E.164
  crmNumber: string; // E.164 — which of our numbers received it
  body?: string | null;
  mediaUrls?: string[];
  twilioSid?: string | null;
  customerName?: string | null;
}) {
  const { companyId, clientNumber, crmNumber } = input;
  const now = new Date();
  const preview =
    input.body?.trim() || (input.mediaUrls?.length ? "📷 Media" : "");

  const conversation = await prisma.smsConversation.upsert({
    where: {
      companyId_clientNumber_crmNumber: { companyId, clientNumber, crmNumber },
    },
    create: {
      companyId,
      clientNumber,
      crmNumber,
      customerName: input.customerName || null,
      unread: 1,
      lastMessageText: preview,
      lastMessageAt: now,
    },
    update: {
      unread: { increment: 1 },
      lastMessageText: preview,
      lastMessageAt: now,
      // only fill name if we don't already have one and one was provided
      ...(input.customerName ? { customerName: input.customerName } : {}),
    },
  });

  await prisma.smsMessage.create({
    data: {
      conversationId: conversation.id,
      direction: "inbound",
      body: input.body?.trim() || null,
      mediaUrls: input.mediaUrls || [],
      twilioSid: input.twilioSid || null,
    },
  });

  return conversation;
}

/* ============================================================
   SHARED HELPER — record an outbound SMS into a conversation.
   Used when sending a text to a client from a job (call-me-back, etc).
============================================================ */
export async function recordOutboundSms(input: {
  companyId: string;
  clientNumber: string; // E.164
  crmNumber: string; // E.164
  body?: string | null;
  twilioSid?: string | null;
  customerName?: string | null;
}) {
  const { companyId, clientNumber, crmNumber } = input;
  const now = new Date();
  const preview = input.body?.trim() || "";

  const conversation = await prisma.smsConversation.upsert({
    where: {
      companyId_clientNumber_crmNumber: { companyId, clientNumber, crmNumber },
    },
    create: {
      companyId,
      clientNumber,
      crmNumber,
      customerName: input.customerName || null,
      unread: 0,
      lastMessageText: preview,
      lastMessageAt: now,
    },
    update: {
      lastMessageText: preview,
      lastMessageAt: now,
      ...(input.customerName ? { customerName: input.customerName } : {}),
    },
  });

  await prisma.smsMessage.create({
    data: {
      conversationId: conversation.id,
      direction: "outbound",
      body: input.body?.trim() || null,
      twilioSid: input.twilioSid || null,
    },
  });

  return conversation;
}

/* ============================================================
   GET /messages/unread-count  → total unread in the inbox
============================================================ */
export async function unreadCount(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    // Muted conversations never count toward badges.
    const [inbox, archive] = await Promise.all([
      prisma.smsConversation.aggregate({
        where: { companyId, box: "inbox", muted: false },
        _sum: { unread: true },
      }),
      prisma.smsConversation.aggregate({
        where: { companyId, box: "archive", muted: false },
        _sum: { unread: true },
      }),
    ]);
    return res.json({
      inbox: inbox._sum.unread || 0,
      archive: archive._sum.unread || 0,
    });
  } catch (err) {
    console.error("🔥 unreadCount error:", err);
    return res.json({ inbox: 0, archive: 0 });
  }
}

/* ============================================================
   GET /messages?box=inbox|blocked|archive  → conversation list
============================================================ */
export async function listConversations(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const box = (req.query.box as string) || "inbox";
    if (!BOXES.includes(box))
      return res.status(400).json({ error: "Invalid box" });

    const conversations = await prisma.smsConversation.findMany({
      where: { companyId, box },
      orderBy: { lastMessageAt: "desc" },
    });

    return res.json(conversations);
  } catch (err) {
    console.error("🔥 listConversations error:", err);
    return res.status(500).json({ error: "Failed to load conversations" });
  }
}

/* ============================================================
   GET /messages/:id  → full thread (and mark as read)
============================================================ */
export async function getThread(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const { id } = req.params;

    const conversation = await prisma.smsConversation.findFirst({
      where: { id, companyId },
    });
    if (!conversation)
      return res.status(404).json({ error: "Conversation not found" });

    const messages = await prisma.smsMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    });

    if (conversation.unread > 0) {
      await prisma.smsConversation.update({
        where: { id },
        data: { unread: 0 },
      });
    }

    return res.json({ conversation: { ...conversation, unread: 0 }, messages });
  } catch (err) {
    console.error("🔥 getThread error:", err);
    return res.status(500).json({ error: "Failed to load thread" });
  }
}

/* ============================================================
   POST /messages/:id/reply  { body }  → send outbound SMS
============================================================ */
export async function sendReply(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const { id } = req.params;
    const body = (req.body?.body || "").trim();

    if (!body) return res.status(400).json({ error: "Message is empty" });

    const conversation = await prisma.smsConversation.findFirst({
      where: { id, companyId },
    });
    if (!conversation)
      return res.status(404).json({ error: "Conversation not found" });
    if (conversation.box === "blocked")
      return res
        .status(400)
        .json({ error: "This conversation is blocked. Unblock to reply." });

    let twilioSid: string | null = null;
    try {
      const sent = await twilioClient.messages.create({
        from: conversation.crmNumber, // the number the client texted
        to: conversation.clientNumber,
        body,
      });
      twilioSid = sent.sid;
    } catch (err: any) {
      console.error("🔥 SMS reply send failed:", err?.message);
      return res.status(502).json({ error: "Failed to send SMS" });
    }

    const message = await prisma.smsMessage.create({
      data: {
        conversationId: id,
        direction: "outbound",
        body,
        twilioSid,
      },
    });

    await prisma.smsConversation.update({
      where: { id },
      data: { lastMessageText: body, lastMessageAt: new Date() },
    });

    return res.json(message);
  } catch (err) {
    console.error("🔥 sendReply error:", err);
    return res.status(500).json({ error: "Failed to send reply" });
  }
}

/* ============================================================
   DELETE /messages/:id  → delete conversation + its messages
============================================================ */
export async function deleteConversation(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const { id } = req.params;

    const conversation = await prisma.smsConversation.findFirst({
      where: { id, companyId },
    });
    if (!conversation)
      return res.status(404).json({ error: "Conversation not found" });

    await prisma.smsConversation.delete({ where: { id } });
    return res.json({ message: "Deleted" });
  } catch (err) {
    console.error("🔥 deleteConversation error:", err);
    return res.status(500).json({ error: "Failed to delete conversation" });
  }
}

/* ============================================================
   PATCH /messages/:id  { box }  → move (inbox | blocked | archive)
============================================================ */
export async function updateConversation(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const { id } = req.params;
    const { box, muted } = req.body || {};

    const data: { box?: string; muted?: boolean } = {};
    if (box !== undefined) {
      if (!BOXES.includes(box))
        return res.status(400).json({ error: "Invalid box" });
      data.box = box;
    }
    if (muted !== undefined) data.muted = !!muted;

    if (Object.keys(data).length === 0)
      return res.status(400).json({ error: "Nothing to update" });

    const conversation = await prisma.smsConversation.findFirst({
      where: { id, companyId },
    });
    if (!conversation)
      return res.status(404).json({ error: "Conversation not found" });

    const updated = await prisma.smsConversation.update({
      where: { id },
      data,
    });

    return res.json(updated);
  } catch (err) {
    console.error("🔥 updateConversation error:", err);
    return res.status(500).json({ error: "Failed to update conversation" });
  }
}
