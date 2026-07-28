"use client";

import { useEffect } from "react";

export default function CRMSettingsPage() {
  // Report rows always open in a new tab now (modal option removed).
  useEffect(() => {
    localStorage.setItem("rowClickMode", "newtab");
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">CRM Settings</h1>

      <div className="bg-white shadow p-4 rounded border max-w-lg">
        <h2 className="text-lg font-semibold mb-2">
          Job Row Click Behavior
        </h2>

        <label className="flex items-center gap-2 mb-2">
          <input type="radio" checked readOnly />
          Open in new tab
        </label>
      </div>
    </div>
  );
}