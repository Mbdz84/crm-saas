"use client";

import { useJob } from "../state/JobProvider";
import { toZonedTime, format } from "date-fns-tz";
import RecordingPlayer from "./RecordingPlayer";

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

/* =========================
   Helpers
========================= */

function formatLogTime(
  date: string | Date,
  tz?: string
) {
  if (!date) return "";

  const effectiveTz =
    tz && tz.length > 0
      ? tz
      : Intl.DateTimeFormat().resolvedOptions().timeZone;

  const zoned = toZonedTime(new Date(date), effectiveTz);

  return `${format(zoned, "MM/dd/yyyy, hh:mm:ss a")} (${effectiveTz})`;
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
  const { job, tab } = useJob();

  if (!job || tab !== "log") return null;

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
                <div>
                  {formatLogTime(log.createdAt, job.timezone)}
                </div>
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
                    {call.leadSource && (
                      <div>
                        <b>To:</b> {call.leadSource}
                      </div>
                    )}
                    <div>
                      <b>Duration:</b> {fmtDuration(call.duration)}
                    </div>
                    {call.recordingUrl ? (
                      <RecordingPlayer url={call.recordingUrl} />
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        No recording.
                      </p>
                    )}
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
    </div>
  );
}