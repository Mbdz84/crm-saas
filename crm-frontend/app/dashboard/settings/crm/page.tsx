"use client";

import { useEffect, useState } from "react";

export default function CRMSettingsPage() {
  const [mode, setMode] = useState("modal"); // ✅ default

  useEffect(() => {
    const saved = localStorage.getItem("rowClickMode");
    setMode(saved || "modal"); // ✅ fallback to modal
  }, []);

  function updateMode(value: string) {
    setMode(value);
    localStorage.setItem("rowClickMode", value);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">CRM Settings</h1>

      <div className="bg-white shadow p-4 rounded border max-w-lg">
        <h2 className="text-lg font-semibold mb-2">
          Job Row Click Behavior
        </h2>

        <label className="flex items-center gap-2 mb-2">
          <input
            type="radio"
            checked={mode === "newtab"}
            onChange={() => updateMode("newtab")}
          />
          Open in new tab
        </label>

        <label className="flex items-center gap-2 mb-2">
          <input
            type="radio"
            checked={mode === "modal"}
            onChange={() => updateMode("modal")}
          />
          Open popup modal (default)
        </label>
      </div>
    </div>
  );
}