"use client";

import JobPreview from "./JobPreview";

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
    <div
      className={`flex items-center justify-between gap-4 py-3 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-0">
        {(() => {
          // De-emphasize the "Can see the …" lead-in; bold the key phrase.
          const m = label.match(/^Can (?:(?:see|use|view) )?(?:(?:the|a) )?/);
          const prefix = m ? m[0] : "";
          const rest = m ? label.slice(m[0].length) : label;
          return (
            <span className="font-normal text-gray-500 dark:text-gray-400">
              {prefix}
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {rest}
              </span>
            </span>
          );
        })()}
        {soon && (
          <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-700 border border-amber-300 bg-amber-50 rounded px-1 py-0.5 align-middle">
            not wired yet
          </span>
        )}
        {hint && <p className="text-sm text-gray-500 mt-0.5">{hint}</p>}
      </div>

      {/* On/off toggle switch */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
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
    <div className="pt-4 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Access & Permissions</h2>
        <p className="text-gray-600 text-sm">
          Everything this user can see and do. Changes apply after you press
          Save Permissions.
        </p>
      </div>

      {/* LOGIN ACCESS + ROLE — side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        {/* LOGIN ACCESS */}
        <Section title="Login access">
        <Toggle
          label="Active User (can log in to the CRM)"
          hint="Off = this person cannot sign in."
          checked={!!tech.canLogin}
          onChange={(v) => set("canLogin", v)}
        />
      </Section>

      {/* ROLE — the master switch above the granular permissions */}
      <Section title="Role">
        <div className="py-1.5">
          <select
            className="w-full border p-2 rounded dark:bg-gray-900"
            value={tech.role || "technician"}
            onChange={(e) => setTech({ ...tech, role: e.target.value })}
          >
            <option value="admin">Admin</option>
            <option value="technician">Technician</option>
            <option value="dispatcher">Dispatcher</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">
            Master switch. <b>Admin</b> = full access (the permissions below are
            ignored). <b>Technician</b> = the permissions below apply, and they
            appear in the job&apos;s technician dropdown. <b>Dispatcher</b> = the
            same permissions below apply, but they do <b>not</b> appear in the
            technician dropdown.
          </p>
        </div>
      </Section>
      </div>

      {/* TOGGLES (left) + LIVE PREVIEW (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-6 items-start">
        {/* LEFT — permission controls */}
        <div className="min-w-0 space-y-5">
      {/* JOB PAGE — ordered top-to-bottom, matching the live preview */}
      <Section title="Job page">
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
          label="Can duplicate jobs"
          checked={tech.canDuplicateJob !== false}
          onChange={(v) => set("canDuplicateJob", v)}
        />
        <Toggle
          label="Can delete jobs"
          checked={tech.canDeleteJob !== false}
          onChange={(v) => set("canDeleteJob", v)}
        />
        <Toggle
          label="Can edit customer name"
          hint="Off = name is shown but locked."
          checked={tech.canEditCustomerName !== false}
          onChange={(v) => set("canEditCustomerName", v)}
        />
        <Toggle
          label="Can see client phone number"
          hint="Off = real number hidden; the masked number + extension still shows."
          checked={tech.canSeeClientPhone !== false}
          onChange={(v) => set("canSeeClientPhone", v)}
        />
        <Toggle
          label="Can see caller ID names"
          hint="The saved name shown next to a phone (e.g. “Moriel - tech”)."
          checked={tech.canSeeCallerId !== false}
          onChange={(v) => set("canSeeCallerId", v)}
        />
        <Toggle
          label="Can refresh call extensions"
          checked={tech.canRefreshExtension !== false}
          onChange={(v) => set("canRefreshExtension", v)}
        />
        <Toggle
          label="Can edit customer address"
          hint="Off = address is shown but locked."
          checked={tech.canEditCustomerAddress !== false}
          onChange={(v) => set("canEditCustomerAddress", v)}
        />
        <Toggle
          label="Can change job type"
          hint="Off = job type is shown but locked."
          checked={tech.canChangeJobType !== false}
          onChange={(v) => set("canChangeJobType", v)}
        />
        <Toggle
          label="Can edit description / notes"
          hint="Off = description is shown but locked."
          checked={tech.canEditDescription !== false}
          onChange={(v) => set("canEditDescription", v)}
        />
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
          label="Can edit status"
          hint="Off = status is shown but locked."
          checked={tech.canEditStatus !== false}
          onChange={(v) => set("canEditStatus", v)}
        />
      </Section>

      {/* JOB CLOSING — bottom of the job, matching the preview */}
      <Section title="Job closing">
        <div className="py-2 text-sm text-gray-600 border-b">
          <b>Pending Close / Pending Cancel.</b> Technician closings and cancels
          are saved as <b>Pending Close</b> / <b>Pending Cancel</b> — no approval
          step. They can keep editing while pending (e.g. change $200 → $170) and
          every change is written to the Log tab like any other event. An admin
          finalizes the Close/Cancel later; once finalized the job is{" "}
          <b>locked</b> (view-only for the tech).
        </div>
        <Toggle
          label="Can see the closing panel ($)"
          checked={!!tech.canSeeClosing}
          onChange={(v) => set("canSeeClosing", v)}
        />
        <Toggle
          label="Can adjust percentages"
          hint="Technician can change the tech / lead / company split."
          checked={!!tech.canAdjustPercentages}
          onChange={(v) => set("canAdjustPercentages", v)}
        />
        <Toggle
          label="Can enter parts in closing"
          hint="Technician can type parts amounts into the closing."
          checked={!!tech.canAdjustParts}
          onChange={(v) => set("canAdjustParts", v)}
        />
        <Toggle
          label="Can adjust fees"
          hint="Technician can change fees in the closing."
          checked={!!tech.canAdjustFees}
          onChange={(v) => set("canAdjustFees", v)}
        />
        <Toggle
          label="Can see Totals & Balances"
          hint="Off = the split box (how much tech / lead / company each gets) is hidden when the job is closed. The tech can still enter amounts and close."
          checked={tech.canSeeTotals !== false}
          onChange={(v) => set("canSeeTotals", v)}
        />
      </Section>

      {/* MODULES (app navigation) */}
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
        <Toggle
          label="Can add new job / parse SMS"
          hint="Off = hides the New Job & SMS Parse buttons in the top bar."
          checked={tech.canCreateJob !== false}
          onChange={(v) => set("canCreateJob", v)}
        />
      </Section>

      {/* JOBS & DATA (scope) */}
      <Section title="Jobs & data">
        <Toggle
          label="Can view all company jobs"
          hint="Off = Can see jobs only assigned to this technician."
          checked={!!tech.canViewAllJobs}
          onChange={(v) => set("canViewAllJobs", v)}
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

        {/* RIGHT — live preview of a job as this technician sees it */}
        <div className="min-w-0">
          <div className="lg:sticky lg:top-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Live preview — what this technician sees
            </p>
            <JobPreview tech={tech} />
          </div>
        </div>
      </div>
    </div>
  );
}
