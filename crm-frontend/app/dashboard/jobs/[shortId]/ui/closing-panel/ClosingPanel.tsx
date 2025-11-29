"use client";

import { useJob } from "../../state/JobProvider";
import { useJobActions } from "../../state/useJobActions";
import PaymentBlocks from "./PaymentBlocks";
import PercentagesPanel from "./PercentagesPanel";
import PartsPanel from "./PartsPanel";
import SummaryPanel from "./SummaryPanel";

export default function ClosingPanel() {
  const {
    job,
    editableJob,
    statuses,
    payments,
    result,
    techPercent,
    leadPercent,
    companyPercent,
    leadAdditionalFee,
    techPaysAdditionalFee,
    excludeTechFromParts,
    includePartsInProfit,
    disableAutoAdjust,
    invoiceNumberState,
  } = useJob();

  const {
    setField,
    calculateSplit,
    closeJob,
    setDisableAutoAdjust,
    setTechPercent,
    setLeadPercent,
    setCompanyPercent,
    setLeadAdditionalFee,
    setTechPaysAdditionalFee,
    setExcludeTechFromParts,
    setIncludePartsInProfit,
    setInvoiceState,
  } = useJobActions();

  if (!job || !editableJob) return null;

  const currentStatusId =
    editableJob.statusId ?? job.statusId ?? undefined;

  const currentStatusName =
    statuses.find((s) => s.id === currentStatusId)?.name ??
    editableJob.jobStatus?.name ??
    editableJob.status ??
    job.jobStatus?.name ??
    job.status ??
    undefined;

  const show = currentStatusName === "Closed" || currentStatusName === "Pending Close";

  if (!show) return null;

  const editingLocked = job.isClosingLocked;

  return (
    <div className="border rounded p-4 bg-white space-y-4">
      {/* HEADER */}
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
          <button
            onClick={async () => {
              const base = process.env.NEXT_PUBLIC_API_URL;
              const res = await fetch(
                `${base}/jobs/${job.shortId}/reopen`,
                {
                  method: "POST",
                  credentials: "include",
                }
              );

              const data = await res.json();
              if (!res.ok) return toast.error(data.error);
              toast.success("Job reopened");
              location.reload();
            }}
            className="px-3 py-1 text-xs bg-red-600 text-white rounded"
          >
            Reopen Job
          </button>
        )}
      </div>

      {/* LOCK WRAPPER */}
      <div className={editingLocked ? "opacity-50 pointer-events-none" : ""}>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          
          {/* LEFT SIDE — PAYMENT BLOCKS */}
          <PaymentBlocks />

          {/* RIGHT SIDE */}
          <div className="space-y-4">

            {/* Percentages */}
            <PercentagesPanel />

            {/* Parts & Fees */}
            <PartsPanel />

            {/* Summary */}
            <SummaryPanel />

            <button
              type="button"
              onClick={() => {
                const r = calculateSplit();
                if (!r) return toast.error("Error calculating");
                closeJob(r);
              }}
              className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 rounded"
            >
              Close Job (Calculate)
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}