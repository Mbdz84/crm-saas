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
  noanswer: "bg-yellow-600",
  ringing: "bg-blue-600",
  inprogress: "bg-blue-500",
  queued: "bg-gray-600",
  unknown: "bg-gray-500",
};

export default function RecordingsTab() {
  const { job, tab, base, setJob, shortId } = useJob();
  const [loading, setLoading] = useState(false);
  const [openTranscript, setOpenTranscript] = useState<string | null>(null);

  if (!job || tab !== "recordings") return null;

  /* ----------------------------------------------------------
     LOAD RECORDINGS
  ---------------------------------------------------------- */
  async function loadRecordings(showToast = true) {
    setLoading(true);
    try {
      const res = await fetch(`${base}/jobs/${shortId}/recordings`, {
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        showToast && toast.error("Failed to load recordings");
        return;
      }

      setJob((prev: any) => ({ ...prev!, recordings: data }));
      showToast && toast.success("Recordings updated");
    } catch {
      showToast && toast.error("Network error");
    }
    setLoading(false);
  }

  const recordings = (job as any).recordings || [];

  return (
    <div className="space-y-4 mt-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Call Recordings</h2>

        <button
          onClick={() => loadRecordings(true)}
          className={`px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm`}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* EMPTY STATE */}
      {recordings.length === 0 && (
        <p className="text-gray-500 text-sm">
          No recordings found for this job.
        </p>
      )}

      {/* ----------------------------------------------------------
          RECORDINGS LIST
      ---------------------------------------------------------- */}
      <div className="space-y-3">
        {recordings.map((rec: any) => (
          <div
            key={rec.callSid}
            className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 shadow-sm"
          >
            {/* TOP LINE: DATE + STATUS */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500">
                {new Date(rec.createdAt).toLocaleString()}
              </span>

              <span
                className={`text-xs text-white px-2 py-1 rounded ${
                  statusColors[rec.status?.toLowerCase() || "unknown"]
                }`}
              >
                {(rec.status || "Unknown").toUpperCase()}
              </span>
            </div>

            {/* LIVE CALL INDICATOR */}
            {rec.status === "in-progress" && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium mb-2">
                <span className="animate-pulse h-3 w-3 rounded-full bg-green-500"></span>
                Call in progress…
              </div>
            )}

            {/* CALL INFO */}
            <div className="text-sm mb-2 leading-tight">
              <div>
                <b>From:</b> {rec.from || "Unknown"}
              </div>
              <div>
                <b>To:</b> {rec.to || "Unknown"}
              </div>
              <div>
                <b>Call SID:</b>{" "}
                <span className="font-mono text-xs">{rec.callSid}</span>
              </div>
            </div>

            {/* ----------------------------------------------------------
                RECORDING PLAYER
            ---------------------------------------------------------- */}
            <div className="mt-2 border rounded-md p-2 bg-white dark:bg-gray-800">
              <div className="flex justify-between items-center">
                <b className="text-xs">Recording</b>
                <span className="text-xs text-gray-400">
                  {rec.duration ? `${rec.duration}s` : ""}
                </span>
              </div>

              <audio
                controls
                src={`${base}/twilio/recording/${rec.recordingSid}`}
                className="mt-1 w-full rounded"
              />

              <a
                href={`${base}/twilio/recording/${rec.recordingSid}`}
                download
                className="text-blue-600 underline text-xs mt-1 inline-block"
              >
                Download MP3
              </a>

              {/* ----------------------------------------------------------
                  TRANSCRIPT COLLAPSIBLE
              ---------------------------------------------------------- */}
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