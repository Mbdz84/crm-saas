"use client";

import { useJob } from "../../state/JobProvider";
import { useJobActions } from "../../state/useJobActions";

export default function PartsPanel() {
  const {
    techParts,
    leadParts,
    companyParts,
    leadAdditionalFee,
    techPaysAdditionalFee,
    excludeTechFromParts,
    includePartsInProfit,
  } = useJob();

  const {
    setTechParts,
    setLeadParts,
    setCompanyParts,
    setLeadAdditionalFee,
    setTechPaysAdditionalFee,
    setExcludeTechFromParts,
    setIncludePartsInProfit,
  } = useJobActions();

  return (
    <div className="border rounded p-3 bg-gray-50 space-y-2">
      <h3 className="text-xs font-semibold">Parts & Fees</h3>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] mb-1">Tech Parts</label>
          <input
            className="border rounded px-1 py-1 w-full text-xs bg-white"
            value={techParts}
            onChange={(e) => setTechParts(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] mb-1">Lead Parts</label>
          <input
            className="border rounded px-1 py-1 w-full text-xs bg-white"
            value={leadParts}
            onChange={(e) => setLeadParts(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] mb-1">Company Parts</label>
          <input
            className="border rounded px-1 py-1 w-full text-xs bg-white"
            value={companyParts}
            onChange={(e) => setCompanyParts(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] mb-1">Add Fee ($)</label>
          <input
            className="border rounded px-1 py-1 w-full text-xs bg-white"
            value={leadAdditionalFee}
            onChange={(e) => setLeadAdditionalFee(e.target.value)}
          />
        </div>
        <div></div>

        <div className="col-span-2 space-y-1 mt-4">
          <label className="inline-flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={techPaysAdditionalFee}
              onChange={(e) =>
                setTechPaysAdditionalFee(e.target.checked)
              }
            />
            Tech pays additional fee
          </label>

          <label className="inline-flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={excludeTechFromParts}
              onChange={(e) =>
                setExcludeTechFromParts(e.target.checked)
              }
            />
            Exclude tech from paying lead/company parts
          </label>

          <label className="inline-flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={includePartsInProfit}
              onChange={(e) =>
                setIncludePartsInProfit(e.target.checked)
              }
            />
            Include parts in profit (visual)
          </label>
        </div>
      </div>
    </div>
  );
}