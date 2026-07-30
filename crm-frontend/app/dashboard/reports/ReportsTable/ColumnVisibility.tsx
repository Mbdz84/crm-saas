"use client";

import { useState } from "react";
import { columnDefs } from "./utils/columnDefs";
import { toast } from "sonner";

export default function ColumnVisibility({
  visible,
  setVisible,
  storageKey = "report_column_defaults",
}: any) {
  // Save current layout as the user's default (per-report storageKey)
  function saveDefaults() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(visible));
      toast.success("Saved as your default layout.");
    } catch (err) {
      console.error("Save default layout error:", err);
    }
  }

  // Reset default layout (delete from localStorage)
  function resetDefaults() {
    localStorage.removeItem(storageKey);
    alert("Reset to system defaults. Reloading…");
    window.location.reload();
  }

  // Select / deselect all columns
  const allChecked = columnDefs.every((c) => visible[c.key]);

  function toggleAll() {
    const next: Record<string, boolean> = {};
    columnDefs.forEach((c) => (next[c.key] = !allChecked));
    setVisible((prev: any) => ({ ...prev, ...next }));
  }

  return (
    <div className="p-3 border rounded bg-white shadow-lg w-[640px] max-w-[90vw] text-sm space-y-3">

      {/* Title + Select all */}
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-700 text-base">
          Show / Hide Columns
        </p>

        <label className="flex items-center gap-2 text-sm cursor-pointer font-medium">
          <input
            type="checkbox"
            className="h-5 w-5 cursor-pointer"
            checked={allChecked}
            onChange={toggleAll}
          />
          Select all
        </label>
      </div>

      {/* Save / Reset Buttons */}
      <div className="flex gap-2 pb-2 border-b">
        <button
          className="px-2 py-1 text-xs bg-blue-100 rounded border"
          onClick={saveDefaults}
        >
          Save as Default
        </button>

        <button
          className="px-2 py-1 text-xs bg-gray-200 rounded border"
          onClick={resetDefaults}
        >
          Reset
        </button>
      </div>

      {/* Checkbox List */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2">
        {columnDefs.map((col) => (
          <label
            key={col.key}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <input
              type="checkbox"
              className="h-5 w-5 cursor-pointer"
              checked={visible[col.key]}
              onChange={() =>
                setVisible((prev: any) => ({
                  ...prev,
                  [col.key]: !prev[col.key],
                }))
              }
            />
            {col.label}
          </label>
        ))}
      </div>
    </div>
  );
}