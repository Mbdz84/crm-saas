"use client";

export default function TabsHeader({
  tab,
  setTab,
}: {
  tab: "overview" | "log" | "recordings";
  setTab: (t: "overview" | "log" | "recordings") => void;
}) {
  return (
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
  );
}