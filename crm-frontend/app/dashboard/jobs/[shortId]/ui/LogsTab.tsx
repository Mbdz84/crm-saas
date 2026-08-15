"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useJob } from "../state/JobProvider";
import { toZonedTime, format } from "date-fns-tz";
import RecordingPlayer from "./RecordingPlayer";

const base = process.env.NEXT_PUBLIC_API_URL;

function fmtDuration(sec?: number | null) {
  if (sec == null) return "—";
  const s = Math.max(0, Math.floor(Number(sec)));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmtPhone(n?: string | null) {
  if (!n) return "—";
  const d = n.replace(/[^\d]/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return ten.length === 10
    ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
    : n;
}

function formatLogTime(date: string | Date, tz?: string) {
  if (!date) return "";
  const effectiveTz =
    tz && tz.length > 0
      ? tz
      : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zoned = toZonedTime(new Date(date), effectiveTz);
  return `${format(zoned, "MM/dd/yyyy, hh:mm:ss a")} (${effectiveTz})`;
}

// For incoming_call logs, the row is created when the call is ATTACHED to the
// job (which can be much later than the call — e.g. a 2nd call that spawns a
// new job attaches earlier calls too). The real call time is stored in the
// log JSON as `occurredAt`; prefer it so each card shows when the call came in.
function logDisplayTime(log: any): string | Date {
  if (log?.type === "incoming_call") {
    try {
      const call = JSON.parse(log.text);
      if (call?.occurredAt) return call.occurredAt;
    } catch {
      /* fall through to createdAt */
    }
  }
  return log.createdAt;
}

function getLogActionLabel(type: string) {
  switch (type) {
    case "created":
      return "🟢 Job Created";
    case "closed":
      return "🔒 Job Closed";
    case "canceled":
    case "cancelled":
      return "❌ Job Canceled";
    case "updated":
      return "✏️ Job Updated";
    case "parsed_sms":
      return "🟦 SMS Parsed";
    case "incoming_call":
      return "📞 Incoming Call";
    default:
      return type.toUpperCase();
  }
}

/* =========================
   LOGS TAB
========================= */

export default function LogsTab() {
  const ctx = useJob() as any;
  const job = ctx.job;
  const tab = ctx.tab;
  const reload = ctx.reload;

  const [busy, setBusy] = useState<string | null>(null);
  const [picker, setPicker] = useState<{
    logId: string;
    from: string;
    jobs: any[];
  } | null>(null);

  async function deleteLog(logId: string) {
    if (!confirm("Remove this call from this job?")) return;
    setBusy(logId);
    try {
      const res = await fetch(`${base}/jobs/logs/${logId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast.success("Removed");
      await reload?.();
    } catch {
      toast.error("Failed to remove");
    }
    setBusy(null);
  }

  async function openMove(logId: string, from: string) {
    setBusy(logId);
    try {
      const res = await fetch(
        `${base}/jobs/search?q=${encodeURIComponent(from)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      const jobs = (data.results || []).filter(
        (j: any) => j.shortId !== job.shortId
      );
      setPicker({ logId, from, jobs });
    } catch {
      toast.error("Failed to load jobs");
    }
    setBusy(null);
  }

  async function moveTo(targetShortId: string) {
    if (!picker) return;
    setBusy(picker.logId);
    try {
      const res = await fetch(`${base}/jobs/logs/${picker.logId}/move`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetShortId }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Moved to ${targetShortId}`);
      setPicker(null);
      await reload?.();
    } catch {
      toast.error("Failed to move");
    }
    setBusy(null);
  }

  if (!job || tab !== "log" || job.viewer?.canSeeLogs === false) return null;

  return (
    <div className="mt-6 space-y-4">
      {job.logs?.length ? (
        job.logs.map((log: any) => (
          <div key={log.id} className="p-4 border rounded bg-gray-50">
            {/* Header */}
            <div className="flex justify-between items-start gap-2 mb-2">
              <div className="text-xs text-gray-600">
                <div className="font-medium text-gray-800">
                  {getLogActionLabel(log.type)}
                </div>
                <div>{formatLogTime(logDisplayTime(log), job.timezone)}</div>
              </div>

              <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-xs whitespace-nowrap">
                {log.type}
              </span>
            </div>

            {/* User */}
            {log.user && (
              <div className="text-xs text-gray-600 mb-2">
                Performed by: <b>{log.user.name}</b>
              </div>
            )}

            {/* Log body */}
            {log.type === "incoming_call" ? (
              (() => {
                let call: any = {};
                try {
                  call = JSON.parse(log.text);
                } catch {
                  return (
                    <div className="text-sm bg-white p-2 rounded border">
                      {log.text}
                    </div>
                  );
                }
                return (
                  <div className="text-sm bg-white p-3 rounded border space-y-1">
                    <div>
                      <b>From:</b> {fmtPhone(call.from)}
                    </div>
                    {(call.leadSource || call.to) && (
                      <div>
                        <b>To:</b> {call.leadSource || ""}
                        {call.leadSource && call.to ? " · " : ""}
                        {call.to ? fmtPhone(call.to) : ""}
                      </div>
                    )}
                    <div>
                      <b>Duration:</b> {fmtDuration(call.duration)}
                    </div>
                    {call.recordingUrl ? (
                      <RecordingPlayer url={call.recordingUrl} />
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">No recording.</p>
                    )}

                    {/* Audit actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => openMove(log.id, call.from)}
                        disabled={busy === log.id}
                        className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Move to job
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteLog(log.id)}
                        disabled={busy === log.id}
                        className="text-xs px-2 py-1 border border-red-500 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="whitespace-pre-line text-sm bg-white p-2 rounded border">
                {log.text}
              </div>
            )}
          </div>
        ))
      ) : (
        <p className="text-sm text-gray-500">No logs yet.</p>
      )}

      {/* MOVE PICKER */}
      {picker && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setPicker(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-lg p-4 w-full max-w-md max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-3">
              Move call to which job? ({fmtPhone(picker.from)})
            </h3>
            {picker.jobs.length === 0 ? (
              <p className="text-sm text-gray-500">
                No other jobs found for this number.
              </p>
            ) : (
              <div className="space-y-2">
                {picker.jobs.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => moveTo(j.shortId)}
                    disabled={busy === picker.logId}
                    className="w-full text-left border rounded p-2 hover:bg-blue-50 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    <div className="font-medium">
                      {j.shortId} — {j.customerName || "No name"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {j.customerAddress || "No address"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {j.jobStatus?.name || "—"}
                      {j.createdAt
                        ? " · " + new Date(j.createdAt).toLocaleDateString()
                        : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
