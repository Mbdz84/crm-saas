"use client";

import { useJob } from "../state/JobProvider";
import OverviewTab from "./OverviewTab";
import LogsTab from "./LogsTab";
import RecordingsTab from "./RecordingsTab";

export default function JobTabs() {
  const { tab, setTab } = useJob();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* TABS */}
      <div className="flex gap-4 border-b pb-2">
        <button
          className={`pb-2 ${tab === "overview" ? "border-b-2 border-blue-600" : ""}`}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>

        <button
          className={`pb-2 ${tab === "log" ? "border-b-2 border-blue-600" : ""}`}
          onClick={() => setTab("log")}
        >
          Log
        </button>

        <button
          className={`pb-2 ${tab === "recordings" ? "border-b-2 border-blue-600" : ""}`}
          onClick={() => setTab("recordings")}
        >
          Recordings
        </button>
      </div>

      {/* ACTIVE TAB */}
      {tab === "overview" && <OverviewTab />}
      {tab === "log" && <LogsTab />}
      {tab === "recordings" && <RecordingsTab />}
    </div>
  );
}
