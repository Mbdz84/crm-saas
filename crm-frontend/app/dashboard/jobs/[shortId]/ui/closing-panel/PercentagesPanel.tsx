"use client";

import { useJob } from "../../state/JobProvider";
import { useJobActions } from "../../state/useJobActions";

export default function PercentagesPanel() {
  const {
    techPercent,
    leadPercent,
    companyPercent,
    disableAutoAdjust,
  } = useJob();

  const {
    handlePercentChange,
    normalizePercent,
    setDisableAutoAdjust,
  } = useJobActions();

  return (
    <div className="border rounded p-3 bg-gray-50">
      <h3 className="text-xs font-semibold mb-2">Percentages</h3>

      <div className="grid grid-cols-3 gap-3">
        {/* Tech % */}
        <div>
          <label className="block text-[10px] mb-1">Tech %</label>
          <input
            className="border rounded px-1 py-1 w-full text-xs bg-white"
            value={techPercent}
            onChange={(e) =>
              handlePercentChange("tech", e.target.value)
            }
            onBlur={() => normalizePercent("tech")}
          />
        </div>

        {/* Lead % */}
        <div>
          <label className="block text-[10px] mb-1">Lead %</label>
          <input
            className="border rounded px-1 py-1 w-full text-xs bg-white"
            value={leadPercent}
            onChange={(e) =>
              handlePercentChange("lead", e.target.value)
            }
            onBlur={() => normalizePercent("lead")}
          />
          <p className="text-[9px] text-gray-400 italic">auto-adjusted</p>
        </div>

        {/* Company % */}
        <div>
          <label className="block text-[10px] mb-1">Company %</label>
          <input
            className="border rounded px-1 py-1 w-full text-xs bg-white"
            value={companyPercent}
            onChange={(e) =>
              handlePercentChange("company", e.target.value)
            }
            onBlur={() => normalizePercent("company")}
          />
          <p className="text-[9px] text-gray-400 italic">auto-adjusted</p>
        </div>
      </div>

      <label className="inline-flex items-center gap-2 mt-2 text-[11px]">
        <input
          type="checkbox"
          checked={disableAutoAdjust}
          onChange={(e) => setDisableAutoAdjust(e.target.checked)}
        />
        Disable auto-adjust
      </label>
    </div>
  );
}