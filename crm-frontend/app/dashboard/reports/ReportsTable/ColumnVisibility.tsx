"use client";

import { useState } from "react";
import { columnDefs } from "./utils/columnDefs";
import { toast } from "sonner";

export default function ColumnVisibility({ visible, setVisible }: any) {
  // Save current layout as the user's default
  function saveDefaults() {
    try {
      localStorage.setItem(
        "report_column_defaults",
        JSON.stringify(visible)
      );
      toast.success("Saved as your default layout.");
    } catch (err) {
      console.error("Save default layout error:", err);
    }
  }

  // Reset default layout (delete from localStorage)
  function resetDefaults() {
    localStorage.removeItem("report_column_defaults");
    alert("Reset to system defaults. Reloading…");
    window.location.reload();
  }

  return (
    <div className="p-3 border rounded bg-white shadow-sm w-60 text-sm space-y-3">

      {/* Title */}
      <p className="font-semibold text-gray-700 text-base">
        Show / Hide Columns
      </p>

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
      <div className="space-y-2">
        {columnDefs.map((col) => (
          <label
            key={col.key}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <input
              type="checkbox"
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