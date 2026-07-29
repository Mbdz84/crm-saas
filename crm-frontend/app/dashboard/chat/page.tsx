"use client";

/**
 * Chat page — WhatsApp-style inbound SMS inbox, wired to the backend:
 *   GET   /messages?box=inbox|blocked|archive → conversation list
 *   GET   /messages/:id                       → thread (+ marks read)
 *   POST  /messages/:id/reply                 → send text reply (Twilio)
 *   PATCH /messages/:id  { box }              → block / archive / move
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Ban, Archive, Inbox, RotateCcw, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const base = process.env.NEXT_PUBLIC_API_URL;

type Box = "inbox" | "blocked" | "archive";

interface Conversation {
  id: string;
  clientNumber: string;
  crmNumber: string;
  customerName: string | null;
  box: Box;
  unread: number;
  lastMessageText: string | null;
  lastMessageAt: string | null;
}

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  body: string | null;
  mediaUrls: string[];
  createdAt: string;
}

const TABS: { key: Box; label: string; icon: React.ReactNode }[] = [
  { key: "inbox", label: "Inbox", icon: <Inbox size={14} /> },
  { key: "blocked", label: "Blocked", icon: <Ban size={14} /> },
  { key: "archive", label: "Archive", icon: <Archive size={14} /> },
];

function fmtPhone(n?: string | null) {
  if (!n) return "";
  const d = n.replace(/[^\d]/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  if (ten.length === 10)
    return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
  return n;
}

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function label(c: Conversation) {
  return c.customerName || fmtPhone(c.clientNumber);
}

export default function ChatPage() {
  const [box, setBox] = useState<Box>("inbox");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [thread, setThread] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [sending, setSending] = useState(false);

  const active = conversations.find((c) => c.id === activeId) || null;

  const loadConversations = useCallback(async () => {
    if (!base) return;
    setLoadingList(true);
    try {
      const res = await fetch(`${base}/messages?box=${box}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) setConversations(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoadingList(false);
    }
  }, [box]);

  // Load list when the tab changes (and reset the open thread on mobile)
  useEffect(() => {
    loadConversations();
    setActiveId("");
  }, [box, loadConversations]);

  const loadThread = useCallback(async (id: string) => {
    if (!base || !id) return;
    try {
      const res = await fetch(`${base}/messages/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setThread(data.messages || []);
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c))
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (activeId) loadThread(activeId);
    else setThread([]);
  }, [activeId, loadThread]);

  // Refresh both the list and the open thread
  const refreshAll = useCallback(() => {
    loadConversations();
    if (activeId) loadThread(activeId);
  }, [loadConversations, loadThread, activeId]);

  // Auto-refresh every 10s — but ONLY while the tab is visible, so a chat
  // left open in a background tab doesn't keep hitting Cloud Run.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") refreshAll();
    };
    const iv = setInterval(tick, 10000);
    // Refresh immediately when the tab regains focus
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshAll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshAll]);

  // Auto-scroll to the newest message when the count changes
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  async function handleSend() {
    if (!draft.trim() || !active || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${base}/messages/${active.id}/reply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send");
        return;
      }
      setThread((prev) => [...prev, data]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === active.id
            ? { ...c, lastMessageText: data.body, lastMessageAt: data.createdAt }
            : c
        )
      );
      setDraft("");
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function moveActive(target: Box) {
    if (!active) return;
    try {
      const res = await fetch(`${base}/messages/${active.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ box: target }),
      });
      if (!res.ok) {
        toast.error("Action failed");
        return;
      }
      setConversations((prev) => prev.filter((c) => c.id !== active.id));
      setActiveId("");
      toast.success(
        target === "blocked"
          ? "Blocked"
          : target === "archive"
          ? "Archived"
          : "Moved to inbox"
      );
    } catch {
      toast.error("Action failed");
    }
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] md:h-[calc(100vh-8rem)] border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
      {/* LEFT — tabs + conversation list */}
      <div
        className={`${
          active ? "hidden md:flex" : "flex"
        } w-full md:w-72 border-r flex-col`}
      >
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Messages</h2>
            <p className="text-xs text-gray-500">Incoming SMS to your CRM numbers</p>
          </div>
          <button
            onClick={refreshAll}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            title="Refresh"
          >
            <RefreshCw size={16} className={loadingList ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b text-xs">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setBox(t.key)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 border-b-2 transition-colors ${
                box === t.key
                  ? "border-blue-600 text-blue-600 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {!loadingList && conversations.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">
              No conversations in {box}.
            </p>
          )}
          {conversations.map((c) => {
            const isActive = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left px-4 py-3 border-b flex flex-col gap-0.5 transition-colors ${
                  isActive
                    ? "bg-blue-50 dark:bg-gray-800"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{label(c)}</span>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                    {fmtTime(c.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500 truncate">
                    {c.lastMessageText || ""}
                  </span>
                  {c.unread > 0 && (
                    <span className="text-[10px] bg-green-600 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {c.unread}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT — active thread */}
      <div className={`${active ? "flex" : "hidden md:flex"} flex-1 flex-col`}>
        {active ? (
          <>
            {/* header */}
            <div className="px-3 py-3 border-b flex items-center gap-2">
              <button
                onClick={() => setActiveId("")}
                className="md:hidden p-1 -ml-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{label(active)}</div>
                <div className="text-xs text-gray-500 truncate">
                  {active.customerName ? `${fmtPhone(active.clientNumber)} · ` : ""}
                  via {fmtPhone(active.crmNumber)}
                </div>
              </div>

              {active.box === "inbox" ? (
                <>
                  <button
                    onClick={() => moveActive("archive")}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                    title="Archive"
                  >
                    <Archive size={16} />
                  </button>
                  <button
                    onClick={() => moveActive("blocked")}
                    className="p-2 rounded hover:bg-red-50 text-red-600"
                    title="Block"
                  >
                    <Ban size={16} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => moveActive("inbox")}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600"
                  title="Move to Inbox"
                >
                  <RotateCcw size={14} /> Inbox
                </button>
              )}
            </div>

            {/* messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-gray-950">
              {thread.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-6">
                  No messages yet.
                </p>
              )}
              {thread.map((m) => {
                const out = m.direction === "outbound";
                return (
                  <div
                    key={m.id}
                    className={`flex ${out ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        out
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-white dark:bg-gray-800 border rounded-bl-none"
                      }`}
                    >
                      {m.mediaUrls?.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt="MMS attachment"
                            className="rounded mb-1 max-w-full max-h-60 object-cover"
                          />
                        </a>
                      ))}
                      {m.body && <div>{m.body}</div>}
                      <div
                        className={`text-[10px] mt-1 ${
                          out ? "text-blue-100" : "text-gray-400"
                        }`}
                      >
                        {fmtTime(m.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* reply box */}
            {active.box === "blocked" ? (
              <div className="p-3 border-t text-center text-xs text-gray-400">
                This number is blocked. Move to Inbox to reply.
              </div>
            ) : (
              <div className="p-3 border-t flex items-center gap-2">
                <input
                  className="flex-1 border rounded-full px-4 py-2 text-sm bg-white dark:bg-gray-800 disabled:opacity-50"
                  placeholder="Type a reply…"
                  value={draft}
                  disabled={sending}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-full text-sm font-medium"
                >
                  {sending ? "…" : "Send"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  );
}
