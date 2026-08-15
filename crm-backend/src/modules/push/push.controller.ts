import { Request, Response } from "express";
import prisma from "../../prisma/client";

/* ============================================================
   PUSH SUBSCRIPTIONS
   The frontend subscribes a browser/device to Web Push and posts
   the subscription here. One row per browser (unique endpoint).
============================================================ */

// POST /push/subscribe  body: { endpoint, keys: { p256dh, auth } }
export async function subscribe(req: Request, res: Response) {
  try {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Invalid subscription" });
    }

    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId,
        companyId,
        userAgent: (req.headers["user-agent"] as string) || null,
      },
      // If this browser re-subscribes (or a different user logs in on it),
      // re-point the row to the current user/company and refresh the keys.
      update: {
        userId,
        companyId,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("push subscribe error:", err);
    return res.status(500).json({ error: "Failed to subscribe" });
  }
}

// POST /push/unsubscribe  body: { endpoint }  (the Do-Not-Disturb / off switch)
export async function unsubscribe(req: Request, res: Response) {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: "endpoint required" });

    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return res.json({ ok: true });
  } catch (err) {
    console.error("push unsubscribe error:", err);
    return res.status(500).json({ error: "Failed to unsubscribe" });
  }
}
