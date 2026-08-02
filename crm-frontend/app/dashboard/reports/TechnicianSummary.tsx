"use client";

import React, { useState } from "react";
import { FileText } from "lucide-react";
import SettleCell from "./SettleCell";
import SettlementInlinePanel from "./SettlementInlinePanel";

export default function TechnicianSummary({
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
    params.append("kind", "tech");
    params.append("name", name);
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    window.open(`/dashboard/reports/view?${params.toString()}`, "_blank");
  }

  /* --------------------------------------------------
     SAFE TOTALS FOR EACH TECH
  -------------------------------------------------- */
  function getTechTotals(techName: string) {
    const techJobs = jobs.filter((j) => j.technician?.name === techName);

    let totalAmount = 0;
    let techProfit = 0;
    let techBalance = 0;

    techJobs.forEach((j) => {
      totalAmount += Number(j.closing?.totalAmount || 0);
      techProfit += Number(j.closing?.techProfit || 0);
      techBalance += Number(j.closing?.techBalance || 0);
    });

    return { totalAmount, techProfit, techBalance };
  }

  /* --------------------------------------------------
     GRAND TOTALS (SAFE)
  -------------------------------------------------- */
  const grand = {
    totalJobs: data.reduce((s, r) => s + Number(r.total || 0), 0),
    closed: data.reduce((s, r) => s + Number(r.closed || 0), 0),
    cancelled: data.reduce((s, r) => s + Number(r.cancelled || 0), 0),
    totalAmount: data.reduce(
      (s, r) => s + Number(getTechTotals(r.name).totalAmount || 0),
      0
    ),
    profit: data.reduce(
      (s, r) => s + Number(getTechTotals(r.name).techProfit || 0),
      0
    ),
    balance: data.reduce(
      (s, r) => s + Number(getTechTotals(r.name).techBalance || 0),
      0
    ),
  };

  return (
    <div className="bg-white border rounded p-4 shadow mt-4">
      <h2 className="text-xl font-semibold mb-3">Technician Summary</h2>

      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1 text-left">Technician</th>
            <th className="border px-2 py-1 text-center">Total</th>
            <th className="border px-2 py-1 text-center">Closed</th>
            <th className="border px-2 py-1 text-center">Cancelled</th>
            <th className="border px-2 py-1 text-center">Closing %</th>
            <th className="border px-2 py-1 text-center">Cancel %</th>
            <th className="border px-2 py-1 text-center">Total Amount</th>
            <th className="border px-2 py-1 text-center">Tech Balance</th>
            <th className="border px-2 py-1 text-center">Tech Profit</th>
            <th className="border px-2 py-1 text-center">Settled</th>
          </tr>
        </thead>

        <tbody>
          {data.map((t: any) => {
            const totals = getTechTotals(t.name);

            const closingPct =
              Number(t.total || 0) > 0
                ? ((Number(t.closed || 0) / Number(t.total || 0)) * 100).toFixed(1)
                : "0";

            const cancelPct =
              Number(t.total || 0) > 0
                ? ((Number(t.cancelled || 0) / Number(t.total || 0)) * 100).toFixed(1)
                : "0";

            return (
              <React.Fragment key={t.name}>
              <tr
                onClick={() => openReport(t.name)}
                className="cursor-pointer hover:bg-blue-50"
              >
                <td className="border px-2 py-1 font-semibold text-lg">
                  {t.name}
                </td>

                <td className="border px-2 py-1 text-center">{Number(t.total || 0)}</td>
                <td className="border px-2 py-1 text-center">{Number(t.closed || 0)}</td>
                <td className="border px-2 py-1 text-center">{Number(t.cancelled || 0)}</td>

                <td className="border px-2 py-1 text-center">{closingPct}%</td>
                <td className="border px-2 py-1 text-center">{cancelPct}%</td>

                <td className="border px-2 py-1 text-center">
                  ${totals.totalAmount.toFixed(2)}
                </td>
                <td className="border px-2 py-1 text-center">
                  ${totals.techBalance.toFixed(2)}
                </td>
                <td className="border px-2 py-1 text-center">
                  ${totals.techProfit.toFixed(2)}
                </td>
                <td className="border px-2 py-1 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {(() => {
                      const techJobs = jobs.filter(
                        (j) => j.technician?.name === t.name && j.closing
                      );
                      return (
                        <SettleCell
                          partyType="technician"
                          partyId={techJobs[0]?.technician?.id}
                          partyName={t.name}
                          from={from}
                          to={to}
                          jobs={techJobs.map((j) => ({
                            jobId: j.id,
                            amount: Number(j.closing?.techBalance || 0),
                          }))}
                        />
                      );
                    })()}
                    <button
                      type="button"
                      title="Payment history"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(expanded === t.name ? null : t.name);
                      }}
                      className="text-gray-500 hover:text-blue-600"
                    >
                      <FileText size={16} />
                    </button>
                  </div>
                </td>
              </tr>
              {expanded === t.name && (
                <tr>
                  <td colSpan={10} className="border p-0">
                    <SettlementInlinePanel
                      partyType="technician"
                      partyId={
                        jobs.find((j) => j.technician?.name === t.name)
                          ?.technician?.id
                      }
                      partyName={t.name}
                    />
                  </td>
                </tr>
              )}
              </React.Fragment>
            );
          })}
        </tbody>

        <tfoot className="bg-gray-200 font-semibold">
          <tr>
            <td className="border px-2 py-1">TOTAL</td>

            <td className="border px-2 py-1 text-center">{grand.totalJobs}</td>
            <td className="border px-2 py-1 text-center">{grand.closed}</td>
            <td className="border px-2 py-1 text-center">{grand.cancelled}</td>

            <td className="border px-2 py-1 text-center">-</td>
            <td className="border px-2 py-1 text-center">-</td>

            <td className="border px-2 py-1 text-center">
              ${grand.totalAmount.toFixed(2)}
            </td>

            <td className="border px-2 py-1 text-center">
              ${grand.balance.toFixed(2)}
            </td>

            <td className="border px-2 py-1 text-center">
              ${grand.profit.toFixed(2)}
            </td>
            <td className="border px-2 py-1 text-center">-</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
