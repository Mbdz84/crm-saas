"use client";

interface Props {
  tech: any;
  setTech: (value: any) => void;
  save: () => Promise<void>;
  saving: boolean;
}

/* ------------------------------------------------------------
   Reusable toggle row.
   `soon` marks options that aren't persisted yet (UI only until
   their DB field + backend enforcement are wired).
------------------------------------------------------------ */
function Toggle({
  label,
  hint,
  checked,
  onChange,
  soon,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  soon?: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 py-1.5 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        className="h-5 w-5 mt-0.5 cursor-pointer disabled:cursor-not-allowed"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="font-medium">{label}</span>
        {soon && (
          <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-700 border border-amber-300 bg-amber-50 rounded px-1 py-0.5 align-middle">
            not wired yet
          </span>
        )}
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded p-4">
      <h3 className="font-semibold mb-1">{title}</h3>
      <div className="divide-y">{children}</div>
    </div>
  );
}

export default function PermissionsTab({
  tech,
  setTech,
  save,
  saving,
}: Props) {
  const set = (field: string, val: boolean) =>
    setTech({ ...tech, [field]: val });

  return (
    <div className="space-y-5 pt-4 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold">Access & Permissions</h2>
        <p className="text-gray-600 text-sm">
          Everything this user can see and do. Options marked{" "}
          <span className="text-[10px] uppercase tracking-wide text-amber-700 border border-amber-300 bg-amber-50 rounded px-1 py-0.5">
            not wired yet
          </span>{" "}
          are visible here but not enforced until wired.
        </p>
      </div>

      {/* PORTAL ACCESS */}
      <Section title="Portal access">
        <Toggle
          label="Can log in to the CRM"
          hint="Master switch — off means no login at all."
          checked={!!tech.canLogin}
          onChange={(v) => set("canLogin", v)}
          soon
        />
      </Section>

      {/* JOBS & DATA */}
      <Section title="Jobs & data">
        <Toggle
          label="Can view all company jobs"
          hint="Off = only jobs assigned to this technician."
          checked={!!tech.canViewAllJobs}
          onChange={(v) => set("canViewAllJobs", v)}
        />
        <Toggle
          label="Can see client phone number"
          hint="Off = real number hidden; the masked number + extension still shows."
          checked={tech.canSeeClientPhone !== false}
          onChange={(v) => set("canSeeClientPhone", v)}
        />
        <Toggle
          label="Can see the Log tab"
          checked={tech.canSeeLogs !== false}
          onChange={(v) => set("canSeeLogs", v)}
        />
        <Toggle
          label="Can see the Recordings tab"
          checked={tech.canSeeRecordings !== false}
          onChange={(v) => set("canSeeRecordings", v)}
        />
        <Toggle
          label="Can see the closing panel ($)"
          checked={!!tech.canSeeClosing}
          onChange={(v) => set("canSeeClosing", v)}
        />
      </Section>

      {/* CLOSING */}
      <Section title="Closing">
        <div className="py-2 text-sm text-gray-600 border-b">
          <b>Pending Close / Pending Cancel.</b> Technician closings and cancels
          are saved as <b>Pending Close</b> / <b>Pending Cancel</b> — no approval
          step. They can keep editing while pending (e.g. change $200 → $170) and
          every change is written to the Log tab like any other event. An admin
          finalizes the Close/Cancel later; once finalized the job is{" "}
          <b>locked</b> (view-only for the tech).
        </div>
        <Toggle
          label="Can enter parts in closing"
          hint="Technician can type parts amounts into the closing."
          checked={!!tech.canAdjustParts}
          onChange={(v) => set("canAdjustParts", v)}
        />
        <Toggle
          label="Can adjust percentages"
          hint="Not allowed for technicians."
          checked={false}
          onChange={() => {}}
          disabled
        />
        <Toggle
          label="Can adjust fees"
          hint="Not allowed for technicians."
          checked={false}
          onChange={() => {}}
          disabled
        />
      </Section>

      {/* MODULES */}
      <Section title="Modules">
        <Toggle
          label="Can see the Dashboard"
          checked={tech.canSeeDashboard !== false}
          onChange={(v) => set("canSeeDashboard", v)}
        />
        <Toggle
          label="Can use Chat"
          checked={tech.canUseChat !== false}
          onChange={(v) => set("canUseChat", v)}
        />
        <Toggle
          label="Can use Search"
          checked={tech.canSeeSearch !== false}
          onChange={(v) => set("canSeeSearch", v)}
        />
        <Toggle
          label="Can see the Calendar"
          hint="Off = no calendar. On = only their own assigned jobs (unless 'view all jobs' is on)."
          checked={tech.canUseCalendar !== false}
          onChange={(v) => set("canUseCalendar", v)}
        />
        <Toggle
          label="Can see Reports"
          hint="On = only their own jobs; lead/company figures hidden."
          checked={tech.canSeeReports !== false}
          onChange={(v) => set("canSeeReports", v)}
        />
      </Section>

      {/* JOB PAGE */}
      <Section title="Job page">
        <Toggle
          label="Can see lead source"
          checked={tech.canSeeLeadSource !== false}
          onChange={(v) => set("canSeeLeadSource", v)}
        />
        <Toggle
          label="Can see the technician field"
          hint="Off = the technician list is hidden on the job."
          checked={tech.canSeeTechnicianField !== false}
          onChange={(v) => set("canSeeTechnicianField", v)}
        />
        <Toggle
          label="Can change job type"
          hint="Off = job type is shown but locked."
          checked={tech.canChangeJobType !== false}
          onChange={(v) => set("canChangeJobType", v)}
        />
        <Toggle
          label="Can edit customer name"
          hint="Off = name is shown but locked."
          checked={tech.canEditCustomerName !== false}
          onChange={(v) => set("canEditCustomerName", v)}
        />
        <Toggle
          label="Can edit customer address"
          hint="Off = address is shown but locked."
          checked={tech.canEditCustomerAddress !== false}
          onChange={(v) => set("canEditCustomerAddress", v)}
        />
        <Toggle
          label="Can refresh call extensions"
          checked={tech.canRefreshExtension !== false}
          onChange={(v) => set("canRefreshExtension", v)}
        />
        <Toggle
          label="Can delete jobs"
          checked={tech.canDeleteJob !== false}
          onChange={(v) => set("canDeleteJob", v)}
        />
        <Toggle
          label="Can duplicate jobs"
          checked={tech.canDuplicateJob !== false}
          onChange={(v) => set("canDuplicateJob", v)}
        />
      </Section>

      <button
        disabled={saving}
        onClick={save}
        className="px-4 py-2 bg-blue-600 text-white rounded w-full disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Permissions"}
      </button>
    </div>
  );
}
