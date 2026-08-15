import webpush from "web-push";
import prisma from "../../prisma/client";

/* ============================================================
   WEB PUSH — sends chat notifications to subscribed devices.
   Requires env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
   Everything here is FAIL-SAFE — it must never break the SMS
   webhook or message recording.
============================================================ */

const PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@moriel.work";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!PUBLIC || !PRIVATE) {
    console.warn("⚠️ Push disabled: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set");
    return false;
  }
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  configured = true;
  return true;
}

function fmtPhone(n?: string | null): string {
  if (!n) return "";
  const d = n.replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return ten.length === 10
    ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
    : n;
}

// Notify every subscribed device in a company about a new inbound chat message.
export async function sendChatPush(opts: {
  companyId: string;
  conversationId: string;
  senderName?: string | null;
  senderNumber: string;
  body?: string | null;
}): Promise<void> {
  try {
    if (!ensureConfigured()) return;

    const subs = await prisma.pushSubscription.findMany({
      where: { companyId: opts.companyId },
    });
    if (subs.length === 0) return;

    const title =
      opts.senderName?.trim() || fmtPhone(opts.senderNumber) || "New message";
    const body = (opts.body || "").trim() || "📷 Media";

    const payload = JSON.stringify({
      title,
      body,
      conversationId: opts.conversationId,
      url: "/dashboard/chat",
    });

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
        } catch (err: any) {
          const code = err?.statusCode;
          // 404 / 410 = the subscription is dead (browser cleared it) — remove it.
          if (code === 404 || code === 410) {
            await prisma.pushSubscription
              .delete({ where: { id: s.id } })
              .catch(() => {});
          } else {
            console.error("push send error:", code, err?.message);
          }
        }
      })
    );
  } catch (err) {
    console.error("⚠️ sendChatPush failed:", err);
  }
}
