"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import GoogleAddressInput from "@/components/GoogleAddressInput";
import { useJob } from "../state/JobProvider";
import { useJobActions } from "../state/useJobActions";
import Editable from "./Editable";
import AppointmentPicker from "./AppointmentPicker";
import { useState } from "react";
import { useEffect } from "react";

// =========================
// Timezone helpers (shared)
// =========================
function toLocalInputValue(date: string | Date, tz?: string) {
  const d = new Date(date);

  const zoned = tz
    ? new Date(
        d.toLocaleString("en-US", {
          timeZone: tz,
          hour12: false,
        })
      )
    : d;

  const pad = (n: number) => String(n).padStart(2, "0");

  return `${zoned.getFullYear()}-${pad(zoned.getMonth() + 1)}-${pad(
    zoned.getDate()
  )}T${pad(zoned.getHours())}:${pad(zoned.getMinutes())}`;
}

function fromLocalInputValue(value: string, tz?: string) {
  if (!value) return null;

  const local = new Date(value);

  if (!tz) return local.toISOString();

  const utc = new Date(
    local.toLocaleString("en-US", { timeZone: "UTC" })
  );

  return utc.toISOString();
}
/* -----------------------------------------------------------
   MAIN OVERVIEW TAB
----------------------------------------------------------- */
export default function OverviewTab() {
  const userRole =
    typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const techRole = userRole;
  const router = useRouter();
  const [appointmentKey, setAppointmentKey] = useState(0);
  const jobCtx = useJob();
  const {
    job,
    editableJob,
    tab,
    statuses,
    jobTypes,
    leadSources,
    techs,
    result,
    techPercent,
    leadPercent,
    companyPercent,
    techParts,
    leadParts,
    companyParts,
    leadAdditionalFee,
    techPaysAdditionalFee,
    excludeTechFromParts,
    includePartsInProfit,
    disableAutoAdjust,
    invoiceNumberState,
    base,
    shortId,
    cancelReason,
    setCancelReason,
  } = jobCtx;

type Reminder = {
  id: string;
  minutes: number;
  sendSms: boolean;
  canceled?: boolean;
  custom?: boolean;
};

const [reminders, setReminders] = useState<Reminder[]>([]);

useEffect(() => {
  if (!job?.reminders) return;

  const mapped = job.reminders.map((r: any) => ({
    id: r.id,
    minutes: r.minutesBefore,
    sendSms: !r.canceled,
    canceled: r.canceled,
    custom: ![60, 90, 120].includes(r.minutesBefore),
  }));

  setReminders(mapped);
}, [job?.reminders]);

  // ✅ always safe array
  const techList = Array.isArray(techs) ? techs : [];

  const {
    setField,
    saveChanges,
    refreshExt,
    addPaymentRow,
    removePaymentRow,
    updatePayment,
    handlePercentChange,
    normalizePercent,
    calculateSplit,
    closeJob,
    setTechParts,
    setLeadParts,
    setCompanyParts,
    setLeadAdditionalFee,
    setTechPaysAdditionalFee,
    setExcludeTechFromParts,
    setIncludePartsInProfit,
    setDisableAutoAdjust,
    setInvoiceState,
  } = useJobActions();

  if (!job || !editableJob || tab !== "overview") return null;

  const displayId = job.shortId || job.id.slice(0, 8);
  const isAdmin = true;

  const currentStatusId = editableJob.statusId ?? job.statusId;
  const currentStatusName =
    statuses.find((s: any) => s.id === currentStatusId)?.name ??
    editableJob.jobStatus?.name ??
    editableJob.status ??
    job.jobStatus?.name ??
    job.status;
// ---------------------------------------------
// Detect if selected status is "Canceled"
// ---------------------------------------------
const selectedStatusIsCanceled = (() => {
  const statusObj = statuses.find((s: any) => s.id === (editableJob.statusId ?? job.statusId));
  if (!statusObj) return false;
  const name = statusObj.name.toLowerCase();
  return ["cancel", "canceled", "cancelled"].includes(name);
})();
  const showClosingPanel =
    currentStatusName === "Closed" || currentStatusName === "Pending Close";

  const editingLocked = job.isClosingLocked === true;

  // 🔢 Masked dial helpers (for phone 1 + phone 2)
  const extension = job.callSessions?.[0]?.extension;

  const maskedDial1 =
    editableJob.customerPhone && extension
      ? `${(editableJob.customerPhone || "")
          .replace(/^\+1/, "")
          .replace(/[^\d]/g, "")},${extension}`
      : null;

  const maskedDial2 =
    (editableJob as any).customerPhone2 && extension
      ? `${((editableJob as any).customerPhone2 || "")
          .replace(/^\+1/, "")
          .replace(/[^\d]/g, "")},${extension}`
      : null;

  function getCollectorOptions(payment: "cash" | "credit" | "check" | "zelle") {
    switch (payment) {
      case "cash":
        return [];
      case "credit":
        return ["tech", "company", "lead"];
      case "check":
      case "zelle":
        return ["company", "lead"];
      default:
        return [];
    }
  }

  return (
    <>
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Job #{displayId}</h1>
          <p className="text-green-500 text-sm">
            Created: {new Date(job.createdAt).toLocaleString()}
          </p>
          {job.closedAt && (
  <p className="text-red-500 text-sm">
    Closed: {new Date(job.closedAt).toLocaleString()}
  </p>
)}

{job.canceledAt && (
  <p className="text-red-500 text-sm">
    Canceled: {new Date(job.canceledAt).toLocaleString()}
  </p>
)}
        </div>

        <div className="flex justify-start items-center gap-3">
          {/* Back */}
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded"
          >
            Back
          </button>

{/* Duplicate → New Job */}
  <button
    onClick={async () => {
      try {
        const res = await fetch(`${base}/jobs/${job.shortId}/duplicate`, {
          method: "POST",
          credentials: "include",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || "Failed to duplicate job");
        }

        toast.success("Job duplicated");
        // ✅ Go back to the job board instead of opening /undefined
        router.push("/dashboard/jobs");
      } catch (err: any) {
        console.error("DUPLICATE JOB ERROR", err);
        toast.error(err?.message || "Duplicate failed");
      }
    }}
    className="px-4 py-2 bg-blue-500 text-white rounded"
  >
    Duplicate → New Job
  </button>
          {/* ALWAYS SHOW DELETE BUTTON */}
          <button
            onClick={async () => {
              if (!confirm("Delete this job permanently?")) return;

              try {
                const res = await fetch(`${base}/jobs/${job.shortId}`, {
                  method: "DELETE",
                  credentials: "include",
                });

                const data = await res.json().catch(() => null);

                if (!res.ok) {
                  throw new Error(data?.error || "Failed to delete job");
                }

                toast.success("Job deleted");
                router.push("/dashboard/jobs");
              } catch (err: any) {
                console.error("DELETE JOB ERROR", err);
                toast.error(err?.message || "Delete failed");
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Delete
          </button>
        </div>
      </div>

      {/* =============================================== */}
      {/* CUSTOMER INFO / LEFT PANEL */}
      {/* =============================================== */}
      <div className="space-y-6 mt-4">
        <div className="border rounded p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
          <h2 className="font-semibold text-lg mb-2">Customer Information</h2>

{/* NAME */}
<Editable
  label="Name"
  value={editableJob.customerName || ""}
  onChange={(v) => setField("customerName", v)}
/>

{/* PHONE 1 */}
<Editable
  label="Phone"
  value={editableJob.customerPhone || ""}
  onChange={(v) => setField("customerPhone", v)}
/>

{/* PHONE 2 */}
<Editable
  label="Phone 2"
  value={(editableJob as any).customerPhone2 || ""}
  onChange={(v) => setField("customerPhone2", v)}
/>

          {/* MASKED DIALS */}
          {extension && (
            <div className="mt-2 flex items-center flex-wrap gap-4 text-s text-gray-500">
              <span>
                Tech Extension: <b>{extension}</b>
              </span>

              {maskedDial1 && (
                <>
                  <span className="text-gray-400">|</span>
                  <span>
                    Masked Dial:{" "}
                    <span className="font-mono">{maskedDial1}</span>
                  </span>
                </>
              )}

              {maskedDial2 && (
                <>
                  <span className="text-gray-400">|</span>
                  <span>
                    Masked Dial 2:{" "}
                    <span className="font-mono">{maskedDial2}</span>
                  </span>
                </>
              )}

              <span className="text-gray-400">—</span>

              <button
                onClick={refreshExt}
                className="text-blue-600 underline"
              >
                Refresh Extension
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium">Address</label>
            <GoogleAddressInput
              value={editableJob.customerAddress || ""}
              onChange={(v) => setField("customerAddress", v)}
            />
          </div>

{/* TIMEZONE */}
<div>
  <label className="block text-sm font-medium">Timezone</label>
  <select
  className="mt-1 w-full border rounded p-2"
  value={editableJob.timezone || "__browser__"}
  onChange={(e) => {
    const val = e.target.value;
    setField(
      "timezone",
      val === "__browser__"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : val
    );
  }}
>
  <option value="__browser__">Use browser timezone</option>
  <option value="America/Chicago">America/Chicago</option>
  <option value="America/New_York">America/New_York</option>
  <option value="America/Denver">America/Denver</option>
  <option value="America/Los_Angeles">America/Los_Angeles</option>
  <option value="America/Phoenix">America/Phoenix</option>
</select>

  <p className="text-xs text-gray-500 mt-1">
    Used for appointments, reminders, and canceled/closed times.
  </p>
</div>


          {/* JOB TYPE */}
          <div>
            <label className="block text-sm font-medium">Job Type</label>
            <select
              className="mt-1 w-full border rounded p-2"
              value={editableJob.jobTypeId || ""}
              onChange={(e) => setField("jobTypeId", e.target.value)}
            >
              <option value="">Select type</option>
              {jobTypes.map((jt: any) => (
                <option key={jt.id} value={jt.id}>
                  {jt.name}
                </option>
              ))}
            </select>
          </div>

          <Editable
            textarea
            label="Description / Notes"
            value={editableJob.description || ""}
            onChange={(v) => setField("description", v)}
          />
        </div>

        {/* =============================================== */}
        {/* TECH / STATUS / SOURCE */}
        {/* =============================================== */}
        <div className="border rounded p-4 space-y-4 bg-white dark:bg-gray-900">
          <div>
            <label className="block text-sm font-medium">Lead Source</label>
            <select
              className="mt-1 w-full border rounded p-2"
              value={editableJob.sourceId || ""}
              onChange={(e) => setField("sourceId", e.target.value)}
            >
              <option value="">Select source</option>
              {leadSources.map((src: any) => (
                <option key={src.id} value={src.id}>
                  {src.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tech + SMS */}
          <div>
            <label className="block text-sm font-medium">Technician</label>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <select
                className="border rounded p-2 flex-1"
                value={editableJob.technicianId || ""}
                onChange={(e) => setField("technicianId", e.target.value)}
              >
                <option value="">Unassigned</option>
                {techList.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.phone ? `(${t.phone})` : ""}
                  </option>
                ))}
              </select>

              <button
                onClick={async () => {
                  const res = await fetch(
                    `${base}/jobs/${job.shortId}/resend-sms`,
                    { method: "POST", credentials: "include" }
                  );
                  res.ok ? toast.success("SMS sent") : toast.error("Failed");
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded sm:w-auto w-full"
              >
                Resend SMS
              </button>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium">Status</label>
            <select
              className="mt-1 w-full border rounded p-2"
              value={editableJob.statusId || ""}
              onChange={(e) => setField("statusId", e.target.value)}
            >
              
              {statuses
                .filter((s: any) => {
                  if (techRole === "technician" && s.name === "Closed")
                    return false;
                  return true;
                })
                .map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
{selectedStatusIsCanceled && (
  <div className="mt-2 space-y-2">

{/* Editable Canceled Date */}
{techRole !== "technician" && (
  <div className="mt-3 max-w-xs">
    <label className="block text-sm font-medium">Canceled At</label>
    <input
  type="datetime-local"
  className="border rounded p-2 mt-1 w-full text-xs"
  value={
    editableJob.canceledAt
      ? toLocalInputValue(editableJob.canceledAt, editableJob.timezone)
      : toLocalInputValue(new Date(), editableJob.timezone)
  }
  onChange={(e) =>
    setField(
      "canceledAt",
      fromLocalInputValue(e.target.value, editableJob.timezone)
    )
  }
/>
    <p className="text-[11px] text-gray-500 mt-1">
      Adjust if the job was canceled at a different time.
    </p>
  </div>
)}



    <label className="text-sm font-medium">Cancel Reason</label>

    {/* Suggested Cancel Reasons */}
    <div className="flex flex-wrap gap-2">
      {[
        "Client not answering",
        "Doesn’t have the money",
        "Went with different company",
        "We cant do the job",
        "Duplicate lead",
        "Don't have the key for it",
        "cx found the keys",
        "Client canceled"
      ].map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() =>
  setCancelReason((prev: string) =>
    prev ? `${prev} | ${tag}` : tag
  )
}
          className="px-2 py-1 text-xs border rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          {tag}
        </button>
      ))}
    </div>

    {/* Textarea */}
    <textarea
  className="w-full border rounded p-2"
  rows={4}
  value={cancelReason}
  onChange={(e) => setCancelReason(e.target.value)}
  placeholder="Why was this job canceled?"
/>
  </div>
)}
{/* Appointment */}
<div>
  <label className="block text-sm font-medium mb-1">Appointment</label>

  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
    <AppointmentPicker
      key={appointmentKey}   // 👈 forces full reset
      value={editableJob.scheduledAt || ""}
      onChange={(v: string) => setField("scheduledAt", v)}
    />

    {/* Clear appointment */}
    <button
      type="button"
      onClick={() => {
        // Clear stored value
        setField("scheduledAt", "");

        // Force picker to reset hour/min UI
        setAppointmentKey((k) => k + 1);
      }}
      className="px-3 py-2 text-sm border rounded text-gray-600 hover:bg-gray-100 sm:w-auto w-full"
    >
      Clear
    </button>
  </div>
</div>
{/* Add Reminder */}
<div className="mt-4">
  <button
    type="button"
    onClick={() =>
      setReminders((prev) => [
        ...prev,
        {
  id: crypto.randomUUID(),
  minutes: 60,
  sendSms: true,
  canceled: false,
  custom: false,
},
      ])
    }
    className="text-blue-600 text-sm font-medium hover:underline"
  >
    + Add Reminder
  </button>
</div>
{/* Reminder Rows */}
<div className="mt-3 space-y-2">
  {reminders.map((r) => (
    <div
      key={r.id}
      className={`flex flex-wrap items-center gap-3 border rounded p-3 ${
  r.canceled ? "bg-red-50 opacity-60" : "bg-gray-50"
}`}
    >
      {/* Remove */}
      <button
        type="button"
        onClick={() =>
  setReminders((prev) =>
    prev.map((x) =>
      x.id === r.id
        ? { ...x, canceled: true, sendSms: false }
        : x
    )
  )
}
        className="w-8 h-8 flex items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100"
      >
        −
      </button>

      {/* Time Select */}
      <select
      disabled={r.canceled}
        value={r.custom ? "custom" : r.minutes}
        onChange={(e) => {
          const val = e.target.value;
          setReminders((prev) =>
            prev.map((x) =>
              x.id === r.id
                ? val === "custom"
                  ? { ...x, custom: true, minutes: 30 }
                  : {
                      ...x,
                      custom: false,
                      minutes: Number(val),
                    }
                : x
            )
          );
        }}
        className="border rounded px-2 py-1"
      >
        <option value={60}>1 hour</option>
        <option value={90}>1.5 hours</option>
        <option value={120}>2 hours</option>
        <option value="custom">Custom</option>
      </select>

      {/* Custom minutes */}
      {r.custom && (
        <input
        disabled={r.canceled}
          type="number"
          min={1}
          className="border rounded px-2 py-1 w-24"
          value={r.minutes}
          onChange={(e) =>
            setReminders((prev) =>
              prev.map((x) =>
                x.id === r.id
                  ? { ...x, minutes: Number(e.target.value) || 0 }
                  : x
              )
            )
          }
        />
      )}

      <span className="text-sm text-gray-600">before appointment</span>

      {/* SMS checkbox */}
      <div className="ml-auto flex items-center gap-4 text-sm">
  {/* Send SMS */}
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={r.sendSms && !r.canceled}
      disabled={r.canceled}
      onChange={(e) =>
        setReminders((prev) =>
          prev.map((x) =>
            x.id === r.id
              ? { ...x, sendSms: e.target.checked }
              : x
          )
        )
      }
    />
    Send SMS
  </label>

  {/* Cancel Reminder */}
  <label className="flex items-center gap-2 text-red-600">
    <input
      type="checkbox"
      checked={r.canceled}
      onChange={(e) =>
        setReminders((prev) =>
          prev.map((x) =>
            x.id === r.id
              ? {
                  ...x,
                  canceled: e.target.checked,
                  sendSms: e.target.checked ? false : x.sendSms,
                }
              : x
          )
        )
      }
    />
    Cancel
  </label>
</div>
    </div>
  ))}
</div>
</div>
{/* SAVE ACTIONS */}
<div className="flex justify-start items-center gap-3 mt-4">
  <button
    type="button"
    onClick={() => {
      console.log("🟢 FRONTEND REMINDERS SENT:", reminders);

      saveChanges({
  statusNote: cancelReason,
  canceledAt: editableJob.canceledAt
    ? new Date(editableJob.canceledAt).toISOString()
    : null,
  reminders: reminders.map((r) => ({
    minutesBefore: r.minutes,
    canceled: r.canceled === true,
  })),
});
    }}
    className="px-4 py-2 rounded shadow text-white bg-green-600"
  >
    Save & Stay
  </button>

  <button
  type="button"
  onClick={async () => {
    await saveChanges({
  statusNote: cancelReason,
  canceledAt: editableJob.canceledAt
    ? new Date(editableJob.canceledAt).toISOString()
    : null,
  reminders: reminders.map((r) => ({
    minutesBefore: r.minutes,
    canceled: r.canceled === true,
  })),
});

    router.push("/dashboard/jobs");
  }}
  className="px-4 py-2 rounded shadow text-white bg-green-600"
>
  Save & Exit
</button>
</div>
        {/* =============================================== */}
        {/* CLOSING PANEL */}
        {/* =============================================== */}
        {showClosingPanel && (
          <ClosingPanel
            job={job}
            editableJob={editableJob} 
            setField={setField}      
            currentStatusName={currentStatusName}
            editingLocked={editingLocked}
            payments={jobCtx.payments}
            userRole={techRole}
            getCollectorOptions={getCollectorOptions}
            techPercent={techPercent}
            leadPercent={leadPercent}
            companyPercent={companyPercent}
            techParts={techParts}
            leadParts={leadParts}
            companyParts={companyParts}
            leadAdditionalFee={leadAdditionalFee}
            techPaysAdditionalFee={techPaysAdditionalFee}
            excludeTechFromParts={excludeTechFromParts}
            includePartsInProfit={includePartsInProfit}
            disableAutoAdjust={disableAutoAdjust}
            invoiceNumberState={invoiceNumberState}
            result={result}
            addPaymentRow={addPaymentRow}
            removePaymentRow={removePaymentRow}
            updatePayment={updatePayment}
            handlePercentChange={handlePercentChange}
            normalizePercent={normalizePercent}
            setTechParts={setTechParts}
            setLeadParts={setLeadParts}
            setCompanyParts={setCompanyParts}
            setLeadAdditionalFee={setLeadAdditionalFee}
            setTechPaysAdditionalFee={setTechPaysAdditionalFee}
            setExcludeTechFromParts={setExcludeTechFromParts}
            setIncludePartsInProfit={setIncludePartsInProfit}
            setDisableAutoAdjust={setDisableAutoAdjust}
            setInvoiceState={setInvoiceState}
            calculateSplit={calculateSplit}
            closeJob={closeJob}
            base={base}
            shortId={job.shortId}
            isAdmin={isAdmin}
            cancelReason={cancelReason}
          />
        )}
      </div>
    </>
  );
}

/* -----------------------------------------------------------
   CLOSING PANEL
----------------------------------------------------------- */
function ClosingPanel(props: any) {
  const {
    job,
    editableJob,   
    setField,      
    currentStatusName,
    editingLocked,
    payments,
    getCollectorOptions,
    techPercent,
    leadPercent,
    companyPercent,
    techParts,
    leadParts,
    companyParts,
    leadAdditionalFee,
    techPaysAdditionalFee,
    excludeTechFromParts,
    includePartsInProfit,
    disableAutoAdjust,
    invoiceNumberState,
    result,
    addPaymentRow,
    removePaymentRow,
    updatePayment,
    handlePercentChange,
    normalizePercent,
    setTechParts,
    setLeadParts,
    setCompanyParts,
    setLeadAdditionalFee,
    setTechPaysAdditionalFee,
    setExcludeTechFromParts,
    setIncludePartsInProfit,
    setDisableAutoAdjust,
    setInvoiceState,
    calculateSplit,
    closeJob,
    base,
    userRole,
    shortId,
    cancelReason,
  } = props;

  const router = useRouter();

  return (
    <div className="border rounded p-4 bg-white space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Job Closing – Payment & Split
          </h2>
          <p className="text-sm text-gray-500">
            Status: <b>{currentStatusName}</b>
          </p>
        </div>

        {editingLocked && (
          <span className="text-xs text-red-500 font-semibold">
            Locked – only admin can modify.
          </span>
        )}
      </div>

      {editingLocked && userRole !== "technician" && (
        <button
          onClick={async () => {
            const res = await fetch(`${base}/jobs/${shortId}/reopen`, {
              method: "POST",
              credentials: "include",
            });
            const data = await res.json();
            if (!res.ok)
              return toast.error(data.error || "Failed to reopen job");
            toast.success("Job reopened");
            router.refresh();
          }}
          className="px-3 py-1 text-xs bg-red-600 text-white rounded ml-4"
        >
          Reopen Job
        </button>
      )}

          {/* EDITABLE CLOSED DATE – inside Closing Panel */}
      {userRole !== "technician" && (
        <div className="mt-4 max-w-xs">
          <label className="block text-sm font-medium">Closed At</label>
          <input
  type="datetime-local"
  className="border rounded p-2 mt-1 w-full text-xs"
  value={
    editableJob.closedAt
      ? toLocalInputValue(editableJob.closedAt, editableJob.timezone)
      : toLocalInputValue(new Date(), editableJob.timezone)
  }
  onChange={(e) =>
    setField(
      "closedAt",
      fromLocalInputValue(e.target.value, editableJob.timezone)
    )
  }
/>
          <p className="text-[11px] text-gray-500 mt-1">
            Change if the job was actually closed on a different date/time.
          </p>
        </div>
      )}

      {/* Disabled UI when job is locked */}
      <div className={editingLocked ? "opacity-50 pointer-events-none" : ""}>
        {/* PAYMENT + RIGHT INFO */}
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {/* LEFT — PAYMENTS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Payment Blocks (Multi-Payment)
              </h3>
              <button
                type="button"
                onClick={addPaymentRow}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
              >
                + Add Payment
              </button>
            </div>

            <div className="space-y-3">
              {payments.map((p: any) => {
                const collectors = getCollectorOptions(p.payment);

                return (
                  <div
                    key={p.id}
                    className="relative grid grid-cols-5 gap-2 border rounded p-2 bg-gray-50 text-xs"
                  >
                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => removePaymentRow(p.id)}
                      className="absolute top-1 right-1 text-red-600 text-[10px] font-bold"
                    >
                      ✕
                    </button>

                    {/* Method */}
                    <div>
                      <label className="block text-[10px] mb-1">Method</label>
                      <select
                        className="border rounded px-1 py-1 w-full text-xs bg-white"
                        value={p.payment}
                        onChange={(e) =>
                          updatePayment(p.id, "payment", e.target.value)
                        }
                      >
                        <option value="cash">Cash</option>
                        <option value="credit">Credit</option>
                        <option value="check">Check</option>
                        <option value="zelle">Zelle</option>
                      </select>
                    </div>

                    {/* Collected By */}
                    <div>
                      {p.payment !== "cash" ? (
                        <>
                          <label className="block text-[10px] mb-1">
                            Collected By
                          </label>
                          <select
                            className="border rounded px-1 py-1 w-full text-xs bg-white"
                            value={p.collectedBy}
                            onChange={(e) =>
                              updatePayment(
                                p.id,
                                "collectedBy",
                                e.target.value
                              )
                            }
                          >
                            {collectors.map((c: string) => (
                              <option key={c} value={c}>
                                {c === "tech"
                                  ? "Technician"
                                  : c === "lead"
                                  ? "Lead Source"
                                  : "Company"}
                              </option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <div className="text-[10px] text-gray-400 mt-4">
                          No choice – Cash → Technician
                        </div>
                      )}
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-[10px] mb-1">
                        Amount ($)
                      </label>
                      <input
                        className="border rounded px-1 py-1 w-full text-xs bg-white"
                        value={p.amount}
                        onChange={(e) =>
                          updatePayment(p.id, "amount", e.target.value)
                        }
                      />
                    </div>

                    {/* Fee Column */}
                    <div className="min-w-[70px]">
                      {p.payment === "credit" && (
                        <>
                          <label className="block text-[10px] mb-1">
                            CC Fee %
                          </label>
                          <input
                            className="border rounded px-1 py-1 w-full text-xs bg-white"
                            value={p.ccFeePct}
                            onChange={(e) =>
                              updatePayment(
                                p.id,
                                "ccFeePct",
                                e.target.value
                              )
                            }
                          />
                        </>
                      )}

                      {p.payment === "check" && (
                        <>
                          <label className="block text-[10px] mb-1">
                            Check Fee %
                          </label>
                          <input
                            className="border rounded px-1 py-1 w-full text-xs bg-white"
                            value={p.checkFeePct}
                            onChange={(e) =>
                              updatePayment(
                                p.id,
                                "checkFeePct",
                                e.target.value
                              )
                            }
                          />
                        </>
                      )}

                      {(p.payment === "cash" || p.payment === "zelle") && (
                        <div className="text-[10px] text-gray-400 mt-4">
                          No Fee
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] text-gray-400 flex items-center">
                      Payment #{p.id}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDE — SUMMARY INFO */}
          <div className="space-y-3">
            {/* Percentages */}
            <div className="border rounded p-3 bg-gray-50">
              <h3 className="text-xs font-semibold mb-2">Percentages</h3>

              <div className="grid grid-cols-3 gap-3">
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
                </div>

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

            {/* Parts + Additional Fees */}
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

              {/* Additional Fee */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] mb-1">Add Fee ($)</label>
                  <input
                    className="border rounded px-1 py-1 w-full text-xs bg-white"
                    value={leadAdditionalFee}
                    onChange={(e) => setLeadAdditionalFee(e.target.value)}
                  />
                </div>
              </div>

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
                  Exclude tech from lead/company parts
                </label>

                <label className="inline-flex items-center gap-2 text-[11px]">
                  <input
                    type="checkbox"
                    checked={includePartsInProfit}
                    onChange={(e) =>
                      setIncludePartsInProfit(e.target.checked)
                    }
                  />
                  Include parts in profit
                </label>
              </div>

              <label className="text-xs">Invoice #</label>
              <input
                className="border rounded px-1 py-1 w-full text-sm"
                value={invoiceNumberState}
                onChange={(e) => setInvoiceState(e.target.value)}
                placeholder="Example: 2025-00123"
              />
            </div>

            {/* SUMMARY */}
            <div className="border rounded p-3 bg-gray-50 text-xs space-y-2">
              <h3 className="font-semibold mb-1">Totals & Balances</h3>

              {result ? (
                <div className="space-y-2">
                  {/* Totals */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div>Total $</div>
                      <div className="font-mono">
                        ${result.totalAmount.toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <div>Parts $</div>
                      <div className="font-mono">
                        ${result.totalParts.toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <div>CC Fee $</div>
                      <div className="font-mono">
                        ${result.totalCcFee.toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <div>Adj Total</div>
                      <div className="font-mono">
                        ${result.adjustedTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="border-t my-1"></div>

                  {/* Profit */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div>Tech Profit</div>
                      <div className="font-mono">
                        ${result.techProfit.toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <div>Lead Profit</div>
                      <div className="font-mono">
                        ${result.leadProfit.toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <div>Company Profit</div>
                      <div className="font-mono">
                        ${result.companyProfit.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Balance Check */}
                  <div className="text-[11px] text-gray-500">
                    <span className="font-bold">SumCheck:</span>{" "}
                    <span
                      className={
                        Math.abs(result.sumCheck) < 0.01
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {result.sumCheck.toFixed(4)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-[11px]">
                  Enter values → press <b>Close Job</b>.
                </p>
              )}

              {userRole !== "technician" && (
  <button
    type="button"
    onClick={() => {
      const r = calculateSplit();
      if (!r) return toast.error("Run calculation first");

      closeJob(r, {
        statusNote: cancelReason,
        closedAt: editableJob.closedAt
          ? new Date(editableJob.closedAt).toISOString()
          : null,
      });
    }}
    className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 rounded"
  >
    Close Job (Admin Only)
  </button>
)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}