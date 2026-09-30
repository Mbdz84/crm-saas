"use client";

import React, { useState } from "react";
import { FileText, ArrowUpDown } from "lucide-react";
import SettleCell from "./SettleCell";
import SettlementInlinePanel from "./SettlementInlinePanel";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
  // "" = default order (as received); otherwise a key from sortOptions
  const [sortBy, setSortBy] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  /* --------------------------------------------------
     SORTING
  -------------------------------------------------- */
  type LeadRow = {
    name: string;
    total?: number;
    closed?: number;
    cancelled?: number;
  };
  const sortOptions: {
    key: string;
    label: string;
    get: (r: LeadRow) => number | string;
  }[] = [
    { key: "name", label: "Lead Source", get: (r) => r.name || "" },
    { key: "total", label: "Total", get: (r) => Number(r.total || 0) },
    { key: "closed", label: "Closed", get: (r) => Number(r.closed || 0) },
    {
      key: "cancelled",
      label: "Cancelled",
      get: (r) => Number(r.cancelled || 0),
    },
    {
      key: "closingPct",
      label: "Closing %",
      get: (r) =>
        Number(r.total || 0) > 0
          ? Number(r.closed || 0) / Number(r.total || 0)
          : 0,
    },
    {
      key: "cancelPct",
      label: "Cancel %",
      get: (r) =>
        Number(r.total || 0) > 0
          ? Number(r.cancelled || 0) / Number(r.total || 0)
          : 0,
    },
    {
      key: "totalAmount",
      label: "Total Amount",
      get: (r) => getLeadTotals(r.name).totalAmount,
    },
    {
      key: "leadBalance",
      label: "Lead Balance (Profit)",
      get: (r) => getLeadTotals(r.name).leadBalance,
    },
  ];

  const activeSort = sortOptions.find((o) => o.key === sortBy);
  const sortedData = activeSort
    ? [...data].sort((a, b) => {
        const av = activeSort.get(a);
        const bv = activeSort.get(b);
        const cmp =
          typeof av === "string" || typeof bv === "string"
            ? String(av).localeCompare(String(bv))
            : (av as number) - (bv as number);
        return sortDir === "asc" ? cmp : -cmp;
      })
    : data;

  return (
    <div className="bg-white border rounded p-4 shadow mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Lead Source Summary</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Sort lead sources"
              className="flex items-center gap-1 text-sm border rounded px-2 py-1 hover:bg-gray-50"
            >
              <ArrowUpDown size={14} />
              {activeSort ? `Sort: ${activeSort.label}` : "Sort by"}
              {activeSort ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
              {sortOptions.map((o) => (
                <DropdownMenuRadioItem key={o.key} value={o.key}>
                  {o.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
              }}
            >
              Direction: {sortDir === "asc" ? "Ascending ↑" : "Descending ↓"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("")}>
              Default order
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
          {sortedData.map((row: any) => {
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

            <td className="border px-2 py-1 text-center">
              {sum("total") > 0
                ? ((sum("closed") / sum("total")) * 100).toFixed(1)
                : "0.0"}
              %
            </td>
            <td className="border px-2 py-1 text-center">
              {sum("total") > 0
                ? ((sum("cancelled") / sum("total")) * 100).toFixed(1)
                : "0.0"}
              %
            </td>

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
