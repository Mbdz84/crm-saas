"use client";

import React, { useState } from "react";
import { FileText } from "lucide-react";
import SettleCell from "./SettleCell";
import SettlementInlinePanel from "./SettlementInlinePanel";

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

  function openReport(name: string) {
    const params = new URLSearchParams();
    params.append("kind", "lead");
    params.append("name", name);
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    window.open(`/dashboard/reports/view?${params.toString()}`, "_blank");
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
            <th className="border px-0 py-1 text-center">Lead Balance (Profit)</th>
            <th className="border px-2 py-1 text-center">Settled</th>
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
                onClick={() => openReport(row.name)}
                className="cursor-pointer hover:bg-gray-100"
              >
                <td className="border px-2 py-1 font-semibold text-lg">
                  {row.name}
                </td>

                <td className="border px-2 py-1 text-center">{Number(row.total || 0)}</td>
                <td className="border px-2 py-1 text-center">{Number(row.closed || 0)}</td>
                <td className="border px-2 py-1 text-center">{Number(row.cancelled || 0)}</td>

                <td className="border px-2 py-1 text-center">{closingPct}%</td>
                <td className="border px-2 py-1 text-center">{cancelPct}%</td>

                <td className="border px-2 py-1 text-center">
                  ${totals.totalAmount.toFixed(2)}
                </td>

                <td className="border px-0 py-1 text-center">
                  ${totals.leadBalance.toFixed(2)}
                </td>
                <td className="border px-2 py-1 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {(() => {
                      const leadJobs = jobs.filter(
                        (j) => j.source?.name === row.name && j.closing
                      );
                      return (
                        <SettleCell
                          partyType="leadSource"
                          partyId={leadJobs[0]?.source?.id}
                          partyName={row.name}
                          from={from}
                          to={to}
                          jobs={leadJobs.map((j) => ({
                            jobId: j.id,
                            amount: Number(j.closing?.leadBalance || 0),
                          }))}
                        />
                      );
                    })()}
                    <button
                      type="button"
                      title="Payment history"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(expanded === row.name ? null : row.name);
                      }}
                      className="text-gray-500 hover:text-blue-600"
                    >
                      <FileText size={16} />
                    </button>
                  </div>
                </td>
              </tr>
              {expanded === row.name && (
                <tr>
                  <td colSpan={9} className="border p-0">
                    <SettlementInlinePanel
                      partyType="leadSource"
                      partyId={
                        jobs.find((j) => j.source?.name === row.name)?.source?.id
                      }
                      partyName={row.name}
                    />
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

            <td className="border px-0 py-1 text-center">
              $
              {data
                .reduce(
                  (s, r) => s + Number(getLeadTotals(r.name).leadBalance || 0),
                  0
                )
                .toFixed(2)}
            </td>
            <td className="border px-2 py-1 text-center">-</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
