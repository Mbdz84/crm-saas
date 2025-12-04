"use client";

import React, { useState } from "react";
import ReportsTable from "./ReportsTable";

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

  function toggle(name: string) {
    setExpanded(expanded === name ? null : name);
  }

  /* --------------------------------------------------
     SAFE TOTALS FOR EACH TECH
  -------------------------------------------------- */
  function getTechTotals(techName: string) {
    const techJobs = jobs.filter((j) => j.technician?.name === techName);

    let totalAmount = 0;
    let techBalance = 0;

    techJobs.forEach((j) => {
      totalAmount += Number(j.closing?.totalAmount || 0);
      techBalance += Number(j.closing?.techBalance || 0);
    });

    return { totalAmount, techBalance };
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
                  onClick={() => toggle(t.name)}
                  className="cursor-pointer hover:bg-blue-50"
                >
                  <td className="border px-2 py-1 font-semibold text-lg flex items-center gap-2">
                    {expanded === t.name && "▲"} {t.name}
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
                </tr>

                {expanded === t.name && (
                  <tr>
                    <td colSpan={8} className="p-0 bg-white">
                      <div
                        className="overflow-x-auto overflow-y-auto transition-all duration-300"
                        style={{ maxHeight: "500px", maxWidth: "100%" }}
                      >
                        <div
                          className="border rounded-b bg-gray-50 shadow-inner"
                          style={{ width: "500px", minWidth: "100%" }}
                        >
                          <div className="p-3">
                            <ReportsTable
                              rows={jobs.filter((j) => j.technician?.name === t.name)}
                              from={from}
                              to={to}
                              expandedTechName={t.name}
                              expandedSourceName={null}
                              defaultVisibleKeys={[
                                "invoice",
                                "jobId",
                                "date",
                                "address",
                                "type",
                                "total",
                                "tech",
                                "techParts",
                                "cc",
                                "addFee",
                                "tech%",
                                "techProfit",
                                "techBal",
                                "leadBal",
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
          </tr>
        </tfoot>
      </table>
    </div>
  );
}