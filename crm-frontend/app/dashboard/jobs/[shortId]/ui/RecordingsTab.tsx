"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useJob } from "../state/JobProvider";

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
  const { job, tab, base, shortId } = useJob();

  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openTranscript, setOpenTranscript] = useState<string | null>(null);
  // Map of normalized number → saved name (from the Caller IDs directory)
  const [callerMap, setCallerMap] = useState<Record<string, string>>({});

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

  if (!job || tab !== "recordings") return null;


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

        <button
          type="button"
          onClick={() => loadRecordings(true)}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* EMPTY STATE */}
      {recordings.length === 0 && (
        <p className="text-gray-500 text-sm">
          No recordings found for this job.
        </p>
      )}

      {/* RECORDINGS LIST */}
      <div className="space-y-3">
        {sortedRecordings.map((rec) => (
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
  <>
    <audio
      controls
      src={rec.url}
      className="mt-1 w-full rounded"
    />

    <a
  href={rec.url}
  target="_blank"
  rel="noopener noreferrer"
  download
  className="text-blue-600 underline text-xs mt-0.5 inline-block"
>
      Download MP3
    </a>
  </>
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