import { Request, Response } from "express";
import twilio from "twilio";
import prisma from "../../prisma/client";
import { sendChatPush } from "../push/push.service";

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

  // Fire web-push notifications to this company's subscribed devices.
  // Fail-safe & non-blocking — never let a push error break SMS recording.
  // Per-user mute is enforced INSIDE sendChatPush: any user who silenced this
  // conversation is filtered out, so they get no push on any of their devices.
  sendChatPush({
    companyId,
    conversationId: conversation.id,
    senderName: conversation.customerName,
    senderNumber: clientNumber,
    body: input.body,
  }).catch(() => {});

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
    const userId = req.user!.id;
    // Conversations THIS user muted never count toward their badges.
    const myMutes = await prisma.conversationMute.findMany({
      where: { userId, conversation: { companyId } },
      select: { conversationId: true },
    });
    const mutedIds = myMutes.map((m) => m.conversationId);
    const [inbox, archive] = await Promise.all([
      prisma.smsConversation.aggregate({
        where: { companyId, box: "inbox", id: { notIn: mutedIds } },
        _sum: { unread: true },
      }),
      prisma.smsConversation.aggregate({
        where: { companyId, box: "archive", id: { notIn: mutedIds } },
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

    // Overlay THIS user's mute state (mute is per-user, not company-wide).
    const userId = req.user!.id;
    const myMutes = await prisma.conversationMute.findMany({
      where: { userId, conversationId: { in: conversations.map((c) => c.id) } },
      select: { conversationId: true },
    });
    const mutedSet = new Set(myMutes.map((m) => m.conversationId));
    const withMute = conversations.map((c) => ({
      ...c,
      muted: mutedSet.has(c.id),
    }));

    return res.json(withMute);
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

    const muted = !!(await prisma.conversationMute.findUnique({
      where: {
        userId_conversationId: { userId: req.user!.id, conversationId: id },
      },
    }));

    return res.json({
      conversation: { ...conversation, unread: 0, muted },
      messages,
    });
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
    const userId = req.user!.id;
    const { id } = req.params;
    const body = req.body || {};
    const { box, muted } = body;

    // Fields stored on the conversation itself (shared across the company).
    const data: { box?: string; displayName?: string | null } = {};
    if (box !== undefined) {
      if (!BOXES.includes(box))
        return res.status(400).json({ error: "Invalid box" });
      data.box = box;
    }
    if ("displayName" in body) {
      const dn = (body.displayName || "").toString().trim();
      data.displayName = dn || null; // empty/number-choice clears it
    }

    const hasConvUpdate = Object.keys(data).length > 0;
    const hasMuteUpdate = muted !== undefined;
    if (!hasConvUpdate && !hasMuteUpdate)
      return res.status(400).json({ error: "Nothing to update" });

    const conversation = await prisma.smsConversation.findFirst({
      where: { id, companyId },
    });
    if (!conversation)
      return res.status(404).json({ error: "Conversation not found" });

    // Mute is PER-USER: a ConversationMute row means THIS user silenced it.
    if (hasMuteUpdate) {
      if (muted) {
        await prisma.conversationMute.upsert({
          where: { userId_conversationId: { userId, conversationId: id } },
          create: { userId, conversationId: id },
          update: {},
        });
      } else {
        await prisma.conversationMute
          .delete({
            where: { userId_conversationId: { userId, conversationId: id } },
          })
          .catch(() => {}); // no row = already unmuted
      }
    }

    let convo: typeof conversation = conversation;
    if (hasConvUpdate) {
      convo = await prisma.smsConversation.update({ where: { id }, data });
    }

    // Reflect this user's current mute state in the response.
    const isMuted = hasMuteUpdate
      ? !!muted
      : !!(await prisma.conversationMute.findUnique({
          where: { userId_conversationId: { userId, conversationId: id } },
        }));

    return res.json({ ...convo, muted: isMuted });
  } catch (err) {
    console.error("🔥 updateConversation error:", err);
    return res.status(500).json({ error: "Failed to update conversation" });
  }
}
