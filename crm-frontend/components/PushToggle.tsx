"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

/* ============================================================
   PushToggle — turns Web Push chat notifications on/off for THIS
   device. Registers the service worker, requests permission,
   subscribes via the browser PushManager, and stores/removes the
   subscription on the backend. Doubles as the Do-Not-Disturb switch.

   variant="icon"  → bell button for the top bar (desktop)
   variant="row"   → full-width row for the mobile sidebar
============================================================ */

const base = process.env.NEXT_PUBLIC_API_URL;
const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// VAPID public key (base64url) → Uint8Array for PushManager.subscribe
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushToggle({
  variant = "icon",
}: {
  variant?: "icon" | "row";
}) {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      !!VAPID;
    setSupported(ok);
    if (!ok) return;
    // Register the SW and reflect current subscription state.
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setOn(!!sub))
      .catch(() => {});
  }, []);

  async function enable() {
    setBusy(true);
    try {
      // iPhone/iPad: web push only works once the app is installed to the
      // Home Screen (Apple limitation). Guide the user instead of failing.
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone =
        (window.navigator as any).standalone === true ||
        window.matchMedia("(display-mode: standalone)").matches;
      if (isIOS && !standalone) {
        toast(
          "On iPhone: tap Share → Add to Home Screen, then open the app from that icon and turn this on."
        );
        setBusy(false);
        return;
      }

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error(
          "Notifications are blocked. Allow them for this site in your browser settings."
        );
        setBusy(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID!),
      });
      const json: any = sub.toJSON();

      const res = await fetch(`${base}/push/subscribe`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error();

      setOn(true);
      toast.success("Chat notifications are on for this device");
    } catch {
      toast.error("Couldn't turn on notifications");
    }
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`${base}/push/unsubscribe`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setOn(false);
      toast.success("Chat notifications are off for this device");
    } catch {
      toast.error("Couldn't turn off notifications");
    }
    setBusy(false);
  }

  if (!supported) return null;

  const toggle = () => (on ? disable() : enable());

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className="flex w-full items-center gap-3 px-4 py-2 rounded-md text-left text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50"
      >
        {on ? (
          <Bell size={18} className="text-green-600" />
        ) : (
          <BellOff size={18} className="text-red-600" />
        )}
        <span className="text-sm font-medium">
          {on ? "Notifications on" : "Notifications off"}
        </span>
      </button>
    );
  }

  // icon variant — top bar (desktop only; visibility controlled by parent)
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={on ? "Turn chat notifications off" : "Turn chat notifications on"}
      title={on ? "Chat notifications: on" : "Chat notifications: off"}
      className="hidden md:grid place-items-center p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition disabled:opacity-50"
    >
      {on ? (
        <Bell size={18} className="text-green-600" />
      ) : (
        <BellOff size={18} className="text-red-600" />
      )}
    </button>
  );
}
