"use client";

import React, { useState } from "react";
import ReportsTable from "./ReportsTable";

export default function LeadSourceSummary({
  data,
  jobs,
  from,
  to,
}: {
  data: any[];
  jobs: any[];
  from?: string;
  to?: string;
}) {
const [expanded, setExpanded] = useState<string | null>(null);
const [showCancelled, setShowCancelled] = useState(false);

  function toggle(name: string) {
    setExpanded(expanded === name ? null : name);
  }

  /* --------------------------------------------------
     SAFE TOTALS FOR EACH LEAD SOURCE
  -------------------------------------------------- */
  function getLeadTotals(sourceName: string) {
    const leadJobs = jobs.filter((j) => j.source?.name === sourceName);

    let totalAmount = 0;
    let leadBalance = 0;

    leadJobs.forEach((j) => {
      totalAmount += Number(j.closing?.totalAmount || 0);
      leadBalance += Number(j.closing?.leadBalance || 0);
    });

    return { totalAmount, leadBalance };
  }

  /* --------------------------------------------------
     GRAND TOTAL HELPERS
  -------------------------------------------------- */
  const sum = (key: string) =>
    data.reduce((s, r) => s + Number(r[key] || 0), 0);

  return (
    <div className="bg-white border rounded p-4 shadow mt-6">
      <h2 className="text-xl font-semibold mb-3">Lead Source Summary</h2>

      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1 text-left">Lead Source</th>
            <th className="border px-2 py-1 text-center">Total</th>
            <th className="border px-2 py-1 text-center">Closed</th>
            <th className="border px-2 py-1 text-center">Cancelled</th>
            <th className="border px-2 py-1 text-center">Closing %</th>
            <th className="border px-2 py-1 text-center">Cancel %</th>
            <th className="border px-2 py-1 text-center">Total Amount</th>
            <th className="border px-2 py-1 text-center">Lead Balance</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row: any) => {
            const totals = getLeadTotals(row.name);

            const closingPct =
              row.total > 0
                ? ((Number(row.closed || 0) / Number(row.total || 0)) * 100).toFixed(1)
                : "0";

            const cancelPct =
              row.total > 0
                ? ((Number(row.cancelled || 0) / Number(row.total || 0)) * 100).toFixed(1)
                : "0";

            return (
              <React.Fragment key={row.name}>
                <tr
                  onClick={() => toggle(row.name)}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <td className="border px-2 py-1 font-semibold text-lg flex items-center gap-2">
                    {expanded === row.name && "▲"} {row.name}
                  </td>

                  <td className="border px-2 py-1 text-center">{Number(row.total || 0)}</td>
                  <td className="border px-2 py-1 text-center">{Number(row.closed || 0)}</td>
                  <td className="border px-2 py-1 text-center">{Number(row.cancelled || 0)}</td>

                  <td className="border px-2 py-1 text-center">{closingPct}%</td>
                  <td className="border px-2 py-1 text-center">{cancelPct}%</td>

                  <td className="border px-2 py-1 text-center">
                    ${totals.totalAmount.toFixed(2)}
                  </td>

                  <td className="border px-2 py-1 text-center">
                    ${totals.leadBalance.toFixed(2)}
                  </td>
                </tr>

                {expanded === row.name && (
                  <tr>
                    <td colSpan={8} className="p-0 bg-white">
                      <div
                        className="overflow-x-auto overflow-y-auto transition-all duration-300"
                        style={{ maxHeight: "500px", maxWidth: "100%" }}
                      >
                        <div className="border rounded bg-gray-50 shadow-inner w-full">
                          <div className="p-3">
                            {/* Show Cancelled Toggle */}
<div className="flex items-center gap-3 mb-3">
  <label className="flex items-center gap-2 text-sm cursor-pointer">
    <input
      type="checkbox"
      checked={showCancelled}
      onChange={(e) => setShowCancelled(e.target.checked)}
    />
    Show cancelled jobs
  </label>
</div>

<ReportsTable
  rows={jobs
  .filter((j) => {
    const isClosed = j.jobStatus?.name === "Closed";
    const isCancelled = !!j.canceledAt || !!j.canceledReason;

    return showCancelled ? isClosed || isCancelled : isClosed;
  })
  .filter((j) =>
    row.name === "Unknown Source"
      ? !j.source || !j.source.name
      : j.source?.name === row.name
  )}
  from={from}
  to={to}
  expandedTechName={null}
  expandedSourceName={row.name}
  defaultVisibleKeys={[
    "invoice",
    "jobId",
    "date",
    "address",
    "type",
    "total",
    "leadProfit",
    "leadBal",
    ...(showCancelled ? ["cancelReason"] : []),
  ]}
/>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>

        {/* ----------------------------------------------------
            GRAND TOTAL ROW
        ---------------------------------------------------- */}
        <tfoot className="bg-gray-200 font-semibold">
          <tr>
            <td className="border px-2 py-1">TOTAL</td>

            <td className="border px-2 py-1 text-center">{sum("total")}</td>
            <td className="border px-2 py-1 text-center">{sum("closed")}</td>
            <td className="border px-2 py-1 text-center">{sum("cancelled")}</td>

            <td className="border px-2 py-1 text-center">-</td>
            <td className="border px-2 py-1 text-center">-</td>

            <td className="border px-2 py-1 text-center">
              $
              {data
                .reduce(
                  (s, r) => s + Number(getLeadTotals(r.name).totalAmount || 0),
                  0
                )
                .toFixed(2)}
            </td>

            <td className="border px-2 py-1 text-center">
              $
              {data
                .reduce(
                  (s, r) => s + Number(getLeadTotals(r.name).leadBalance || 0),
                  0
                )
                .toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}