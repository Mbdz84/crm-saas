"use client";

import { useJob } from "../state/JobProvider";

export default function TabsHeader({
  tab,
  setTab,
}: {
  tab: "overview" | "log" | "recordings";
  setTab: (t: "overview" | "log" | "recordings") => void;
}) {
  const { job } = useJob() as any;
  const viewer = job?.viewer;

  // Hide only when the viewer explicitly can't see it (admins have no viewer
  // restriction; while loading, show everything).
  const showLog = viewer?.canSeeLogs !== false;
  const showRecordings = viewer?.canSeeRecordings !== false;

  return (
    <div className="flex gap-4 border-b pb-2">
      <button
        className={`pb-2 ${tab === "overview" ? "border-b-2 border-blue-600" : ""}`}
        onClick={() => setTab("overview")}
      >
        Overview
      </button>

      {showLog && (
        <button
          className={`pb-2 ${tab === "log" ? "border-b-2 border-blue-600" : ""}`}
          onClick={() => setTab("log")}
        >
          Log
        </button>
      )}

      {showRecordings && (
        <button
          className={`pb-2 ${
            tab === "recordings" ? "border-b-2 border-blue-600" : ""
          }`}
          onClick={() => setTab("recordings")}
        >
          Recordings
        </button>
      )}
    </div>
  );
}
