"use client";

interface Props {
  tech: any;
  setTech: (value: any) => void;
  save: () => Promise<void>;
  saving: boolean;
}

export default function PermissionsTab({ tech, setTech, save, saving }: Props) {
  return (
    <div className="space-y-6 pt-4">

      <h2 className="text-xl font-semibold">Permissions</h2>
      <p className="text-gray-600 text-sm mb-4">
        Control what this technician can see and adjust.
      </p>

      {/* CAN SEE CLOSING PANEL */}
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={tech.canSeeClosing}
          onChange={(e) =>
            setTech({ ...tech, canSeeClosing: e.target.checked })
          }
        />
        <span>Can see closing panel</span>
      </label>

      {/* CAN VIEW ALL JOBS */}
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={tech.canViewAllJobs}
          onChange={(e) =>
            setTech({ ...tech, canViewAllJobs: e.target.checked })
          }
        />
        <span>Can view all company jobs (not only assigned)</span>
      </label>

      <hr />

      <h3 className="font-medium">What can he adjust?</h3>

      {/* PERMISSION CHECKBOXES */}
      <label className="flex items-center gap-3 mt-2">
        <input
          type="checkbox"
          checked={tech.canAdjustPercentages}
          onChange={(e) =>
            setTech({ ...tech, canAdjustPercentages: e.target.checked })
          }
        />
        <span>Can adjust percentages</span>
      </label>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={tech.canAdjustParts}
          onChange={(e) =>
            setTech({ ...tech, canAdjustParts: e.target.checked })
          }
        />
        <span>Can adjust parts fields</span>
      </label>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={tech.canAdjustFees}
          onChange={(e) =>
            setTech({ ...tech, canAdjustFees: e.target.checked })
          }
        />
        <span>Can adjust fee settings</span>
      </label>

      <button
        disabled={saving}
        onClick={save}
        className="px-4 py-2 bg-blue-600 text-white rounded w-full mt-6"
      >
        {saving ? "Saving..." : "Save Permissions"}
      </button>

    </div>
  );
}