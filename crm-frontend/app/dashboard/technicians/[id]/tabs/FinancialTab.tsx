"use client";

interface Props {
  tech: any;
  setTech: (value: any) => void;
  save: () => Promise<void>;
  saving: boolean;
}

export default function FinancialTab({ tech, setTech, save, saving }: Props) {
  return (
    <div className="space-y-6 pt-4">

      <h2 className="text-xl font-semibold">Financial Defaults</h2>
      <p className="text-gray-600 text-sm mb-4">
        These defaults are applied when this technician closes a job.
      </p>

      {/* DEFAULT TECH PERCENT */}
      <div>
        <label className="block font-medium">Default Tech %</label>
        <input
          type="number"
          step="0.01"
          placeholder="e.g. 40"
          className="border p-2 w-full"
          value={tech.defaultTechPercent || ""}
          onChange={(e) =>
            setTech({ ...tech, defaultTechPercent: e.target.value })
          }
        />
      </div>

      {/* ✅ EXCLUDE TECH FROM PAYING PARTS (replaces dropdown) */}
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={tech.defaultPartsResponsibility === "company"}
          onChange={(e) =>
            setTech({
              ...tech,
              defaultPartsResponsibility: e.target.checked ? "company" : "",
            })
          }
        />
        <span>Exclude tech from paying parts</span>
      </label>

      {/* TECH PAYS EXTRA FEE TOGGLE */}
      <label className="flex items-center gap-3 mt-2">
        <input
          type="checkbox"
          checked={tech.defaultTechPaysExtraFee || false}
          onChange={(e) =>
            setTech({ ...tech, defaultTechPaysExtraFee: e.target.checked })
          }
        />
        <span>Tech pays “additional fee” by default</span>
      </label>

      <hr />

      {/* CC FEE % */}
      <div>
        <label className="block font-medium">Default CC Fee %</label>
        <input
          type="number"
          step="0.01"
          placeholder="e.g. 3.5"
          className="border p-2 w-full"
          value={tech.defaultCcFeePercent || ""}
          onChange={(e) =>
            setTech({ ...tech, defaultCcFeePercent: e.target.value })
          }
        />
      </div>

      {/* CHECK FEE % */}
      <div>
        <label className="block font-medium">Default Check Fee %</label>
        <input
          type="number"
          step="0.01"
          placeholder="e.g. 1.5"
          className="border p-2 w-full"
          value={tech.defaultCheckFeePercent || ""}
          onChange={(e) =>
            setTech({ ...tech, defaultCheckFeePercent: e.target.value })
          }
        />
      </div>

      <button
        disabled={saving}
        onClick={save}
        className="px-4 py-2 bg-blue-600 text-white rounded w-full mt-6"
      >
        {saving ? "Saving..." : "Save Financial Defaults"}
      </button>

    </div>
  );
}