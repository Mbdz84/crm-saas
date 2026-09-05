"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useJob } from "../state/JobProvider";
import RecordingPlayer from "./RecordingPlayer";

const SMS_PRESETS = [
  "It's the locksmith, please call me back.",
  "Hi, this is your locksmith technician. Please call me back.",
  "We tried reaching you about your service. Please call back.",
  "Call me",
  "it's the locksmith",
];

// Phone values may carry a ",ext" suffix — strip it for SMS
const barePhone = (p?: string) => (p || "").split(",")[0].trim();

/* ----------------------------------------------------------
   STATUS BADGE COLORS
---------------------------------------------------------- */
const statusColors: Record<string, string> = {
  completed: "bg-green-600",
  busy: "bg-red-600",
  failed: "bg-red-700",
  "no-answer": "bg-yellow-600",
  noanswer: "bg-yellow-600",
  ringing: "bg-blue-600",
  inprogress: "bg-blue-500",
  queued: "bg-gray-600",
  unknown: "bg-gray-500",
};

export default function RecordingsTab() {
  const { job, tab, base, shortId, reload } = useJob();

  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openTranscript, setOpenTranscript] = useState<string | null>(null);
  // Map of normalized number → saved name (from the Caller IDs directory)
  const [callerMap, setCallerMap] = useState<Record<string, string>>({});

  // Send-SMS panel
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsTo, setSmsTo] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  // Which number this job's SMS goes out from (tech mask, or CRM fallback)
  const [smsSender, setSmsSender] = useState<{
    from: string;
    label: string;
    masked: boolean;
  } | null>(null);

  /* ----------------------------------------------------------
     AUTO LOAD WHEN TAB OPENS
  ---------------------------------------------------------- */
  useEffect(() => {
    if (tab === "recordings") {
      loadRecordings(false);
      // Load the caller-ID directory for name lookups
      fetch(`${base}/caller-ids`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : []))
        .then((rows: { number: string; name: string }[]) => {
          const map: Record<string, string> = {};
          for (const c of rows || [])
            map[(c.number || "").replace(/[^\d]/g, "").slice(-10)] = c.name;
          setCallerMap(map);
        })
        .catch(() => {});
    }
  }, [tab]);

const sortedRecordings = recordings
  .slice()
  .sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );

// Merge sent SMS (from the job log) into the same timeline as recordings
const smsSentItems = (((job?.logs as any[]) || [])
  .filter((l) => l.type === "sms_sent")
  .map((l) => ({
    _type: "sms",
    id: l.id,
    createdAt: l.createdAt,
    text: l.text,
  })));

const timeline = [
  ...sortedRecordings.map((r: any) => ({ ...r, _type: "recording" })),
  ...smsSentItems,
].sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
);

  if (!job || tab !== "recordings" || job.viewer?.canSeeRecordings === false)
    return null;


  function normalizePhone(phone?: string) {
  return (phone || "").replace(/[^\d]/g, "").slice(-10);
}

function labelPhone(phone?: string) {
  if (!phone) return "Unknown";

  const current = normalizePhone(phone);
  const customer = normalizePhone(job?.customerPhone);
  const customer2 = normalizePhone(job?.customerPhone2);

  const tags: string[] = [];
  if (
    current &&
    ((customer && current === customer) || (customer2 && current === customer2))
  ) {
    tags.push("(Customer)");
  }
  const savedName = callerMap[current];
  if (savedName) tags.push(`(${savedName})`);

  return tags.length ? `${phone} ${tags.join("")}` : phone;
}

// Append "(Customer)" and the saved Caller ID name after any phone number
function annotatePhones(text?: string) {
  if (!text) return "";
  const customer = normalizePhone(job?.customerPhone);
  const customer2 = normalizePhone(job?.customerPhone2);
  return text.replace(/\+?\d{10,11}/g, (m) => {
    const norm = m.replace(/[^\d]/g, "").slice(-10);
    const tags: string[] = [];
    if (norm && (norm === customer || norm === customer2))
      tags.push("(Customer)");
    const name = callerMap[norm];
    if (name) tags.push(`(${name})`);
    return tags.length ? `${m} ${tags.join("")}` : m;
  });
}

  function openSmsPanel() {
    setSmsTo(barePhone(job?.customerPhone) || barePhone(job?.customerPhone2));
    setSmsBody("");
    setSmsOpen(true);

    // Resolve the sending number so the dispatcher sees it before sending
    setSmsSender(null);
    fetch(`${base}/jobs/${shortId}/sms-sender`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setSmsSender(s))
      .catch(() => {});
  }

  async function handleSendSms() {
    if (!smsBody.trim() || !smsTo.trim() || smsSending) return;
    setSmsSending(true);
    try {
      const res = await fetch(`${base}/jobs/${shortId}/send-sms`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: smsTo, body: smsBody.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send");
        return;
      }
      toast.success("SMS sent");
      setSmsBody("");
      setSmsOpen(false);
      // Refresh the job so the new sms_sent log appears in the timeline now
      reload?.();
    } catch {
      toast.error("Failed to send");
    } finally {
      setSmsSending(false);
    }
  }

  /* ----------------------------------------------------------
     LOAD RECORDINGS
  ---------------------------------------------------------- */
  async function loadRecordings(showToast = true) {
    setLoading(true);
    console.log("🎧 Loading recordings…");

    try {
      const res = await fetch(`${base}/jobs/${shortId}/recordings`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log("✅ Recordings loaded:", data);

      setRecordings(data);
      showToast && toast.success("Recordings updated");
    } catch (err) {
      console.error("❌ loadRecordings failed", err);
      showToast && toast.error("Failed to load recordings");
    } finally {
      setLoading(false);
    }
  }

  /* ----------------------------------------------------------
     UI
  ---------------------------------------------------------- */
  return (
    <div className="space-y-4 mt-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Call Recordings</h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openSmsPanel}
            className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm"
          >
            Send SMS
          </button>
          <button
            type="button"
            onClick={() => {
              loadRecordings(true);
              reload?.();
            }}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* SEND SMS PANEL */}
      {smsOpen && (
        <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-900 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Send SMS to client</h3>
            <button
              onClick={() => setSmsOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          </div>

          {/* SENDING FROM */}
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <b>From:</b>{" "}
            {smsSender ? (
              <>
                {smsSender.from}{" "}
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded text-white ${
                    smsSender.masked ? "bg-purple-600" : "bg-gray-500"
                  }`}
                >
                  {smsSender.label}
                </span>
              </>
            ) : (
              "resolving\u2026"
            )}
          </div>

          {/* which number */}
          <div className="flex flex-wrap gap-2 text-sm">
            {[barePhone(job.customerPhone), barePhone(job.customerPhone2)]
              .filter(Boolean)
              .map((num) => (
                <button
                  key={num}
                  onClick={() => setSmsTo(num)}
                  className={`px-2 py-1 rounded border ${
                    smsTo === num
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-gray-800"
                  }`}
                >
                  {num}
                </button>
              ))}
          </div>

          {/* presets */}
          <div className="flex flex-wrap gap-2">
            {SMS_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setSmsBody(p)}
                className="text-xs px-2 py-1 rounded bg-white dark:bg-gray-800 border hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {p}
              </button>
            ))}
          </div>

          <textarea
            className="w-full border rounded p-2 text-sm dark:bg-gray-800"
            rows={3}
            placeholder="Type a message…"
            value={smsBody}
            onChange={(e) => setSmsBody(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setSmsOpen(false)}
              className="px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSendSms}
              disabled={smsSending || !smsBody.trim() || !smsTo.trim()}
              className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 text-white text-sm disabled:opacity-50"
            >
              {smsSending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {timeline.length === 0 && (
        <p className="text-gray-500 text-sm">
          No recordings or messages for this job.
        </p>
      )}

      {/* TIMELINE: recordings + sent SMS */}
      <div className="space-y-3">
        {timeline.map((rec: any) =>
          rec._type === "sms" ? (
            <div
              key={rec.id}
              className="relative border rounded-lg p-3 bg-green-50 dark:bg-gray-900 shadow-sm"
            >
              <span className="absolute top-3 right-3 text-xs text-white px-2 py-1 rounded bg-green-600">
                SMS SENT
              </span>
              <span className="text-sm font-medium text-gray-600 block">
                {new Date(rec.createdAt).toLocaleString()}
              </span>
              <div className="text-sm mt-2 whitespace-pre-wrap">
                {annotatePhones(rec.text)}
              </div>
            </div>
          ) : (
          <div
  key={rec.recordingSid || rec.callSid}
  className="relative border rounded-lg p-3 bg-gray-50 dark:bg-gray-900 shadow-sm grid grid-cols-1 md:grid-cols-[1fr_360px] gap-3"
>
            {/* DATE + STATUS */}
            {/* STATUS BADGE */}
<span
  className={`absolute top-3 right-3 text-xs text-white px-2 py-1 rounded ${
    statusColors[rec.status?.toLowerCase() || "unknown"]
  }`}
>
  {(rec.status || "unknown").replace("-", " ").toUpperCase()}
</span>

{/* LEFT COLUMN – DATE + CALL INFO */}
<div className="space-y-2">
  <span className="text-sm font-medium text-gray-600 block">
    {new Date(rec.createdAt).toLocaleString()}
  </span>

  <div className="text-sm space-y-1">
    <div>
      <b>From:</b> {labelPhone(rec.from)}
    </div>
    <div>
      <b>To:</b> {labelPhone(rec.to)}
    </div>
    <div className="text-xs text-gray-500">
      <b>Call SID:</b>{" "}
      <span className="font-mono">{rec.callSid}</span>
    </div>
  </div>
</div>

            {/* PLAYER */}
            {/* RIGHT COLUMN – RECORDING */}
<div className="border rounded-md p-2 bg-white dark:bg-gray-800">
              <div className="flex justify-between items-center mb-1">
  <b className="text-xs uppercase tracking-wide">Recording</b>
  <span className="text-xs text-gray-400">
    {rec.duration ? `${rec.duration}s` : ""}
  </span>
</div>

              {rec.recordingSid ? (
  <RecordingPlayer url={rec.url} />
) : (
  <div className="text-xs text-red-600 font-medium mt-2">
    Call failed ({rec.status})
  </div>
)}

              {/* TRANSCRIPT */}
              {rec.transcript && (
                <div className="mt-2">
                  <button
                    onClick={() =>
                      setOpenTranscript(
                        openTranscript === rec.recordingSid
                          ? null
                          : rec.recordingSid
                      )
                    }
                    className="text-blue-600 underline text-xs"
                  >
                    {openTranscript === rec.recordingSid
                      ? "Hide transcript"
                      : "Show transcript"}
                  </button>

                  {openTranscript === rec.recordingSid && (
                    <div className="mt-2 p-2 text-xs rounded bg-gray-100 dark:bg-gray-700 whitespace-pre-wrap">
                      {rec.transcript}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}