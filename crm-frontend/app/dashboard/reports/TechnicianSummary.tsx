"use client";

import React, { useState } from "react";
import { FileText, ArrowLeftRight, ArrowUpDown } from "lucide-react";
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
  // false = Tech Profit first, Tech Balance second (default order)
  // true  = Tech Balance first, Tech Profit second
  const [swapCols, setSwapCols] = useState(false);
  // "" = default order (as received); otherwise a key from sortOptions
  const [sortBy, setSortBy] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  function toggleSwap() {
    setSwapCols((v) => !v);
  }

  /* --------------------------------------------------
     SORTING
  -------------------------------------------------- */
  type TechRow = {
    name: string;
    total?: number;
    closed?: number;
    cancelled?: number;
  };
  const sortOptions: {
    key: string;
    label: string;
    get: (t: TechRow) => number | string;
  }[] = [
    { key: "name", label: "Technician", get: (t) => t.name || "" },
    { key: "total", label: "Total", get: (t) => Number(t.total || 0) },
    { key: "closed", label: "Closed", get: (t) => Number(t.closed || 0) },
    { key: "cancelled", label: "Cancelled", get: (t) => Number(t.cancelled || 0) },
    {
      key: "closingPct",
      label: "Closing %",
      get: (t) =>
        Number(t.total || 0) > 0 ? Number(t.closed || 0) / Number(t.total || 0) : 0,
    },
    {
      key: "cancelPct",
      label: "Cancel %",
      get: (t) =>
        Number(t.total || 0) > 0
          ? Number(t.cancelled || 0) / Number(t.total || 0)
          : 0,
    },
    {
      key: "totalAmount",
      label: "Total Amount",
      get: (t) => getTechTotals(t.name).totalAmount,
    },
    {
      key: "techProfit",
      label: "Tech Profit",
      get: (t) => getTechTotals(t.name).techProfit,
    },
    {
      key: "techBalance",
      label: "Tech Balance",
      get: (t) => getTechTotals(t.name).techBalance,
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

  /* --------------------------------------------------
     SWAPPABLE COLUMNS: Tech Balance <-> Tech Profit
  -------------------------------------------------- */
  const balanceHeader = (
    <th
      key="balance"
      onClick={toggleSwap}
      title="Click to swap Balance / Profit column order"
      className="border px-2 py-1 text-center cursor-pointer hover:bg-gray-200 select-none"
    >
      Tech Balance
    </th>
  );
  const profitHeader = (
    <th
      key="profit"
      onClick={toggleSwap}
      title="Click to swap Balance / Profit column order"
      className="border px-2 py-1 text-center cursor-pointer hover:bg-gray-200 select-none"
    >
      Tech Profit
    </th>
  );
  const orderedHeaders = swapCols
    ? [balanceHeader, profitHeader]
    : [profitHeader, balanceHeader];

  const balanceFooter = (
    <td key="balance" className="border px-2 py-1 text-center">
      ${grand.balance.toFixed(2)}
    </td>
  );
  const profitFooter = (
    <td key="profit" className="border px-2 py-1 text-center">
      ${grand.profit.toFixed(2)}
    </td>
  );
  const orderedFooters = swapCols
    ? [balanceFooter, profitFooter]
    : [profitFooter, balanceFooter];

  return (
    <div className="bg-white border rounded p-4 shadow mt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Technician Summary</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSwap}
            title="Swap the Tech Balance and Tech Profit columns"
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            <ArrowLeftRight size={14} />
            Swap Balance / Profit
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="Sort technicians"
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
      </div>

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
            {orderedHeaders}
            <th className="border px-2 py-1 text-center">Settled</th>
          </tr>
        </thead>

        <tbody>
          {sortedData.map((t: any) => {
            const totals = getTechTotals(t.name);

            const closingPct =
              Number(t.total || 0) > 0
                ? ((Number(t.closed || 0) / Number(t.total || 0)) * 100).toFixed(1)
                : "0";

            const cancelPct =
              Number(t.total || 0) > 0
                ? ((Number(t.cancelled || 0) / Number(t.total || 0)) * 100).toFixed(1)
                : "0";

            const balanceCell = (
              <td key="balance" className="border px-2 py-1 text-center">
                ${totals.techBalance.toFixed(2)}
              </td>
            );
            const profitCell = (
              <td key="profit" className="border px-2 py-1 text-center">
                ${totals.techProfit.toFixed(2)}
              </td>
            );
            const orderedCells = swapCols
              ? [balanceCell, profitCell]
              : [profitCell, balanceCell];

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
                {orderedCells}
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

            {orderedFooters}
            <td className="border px-2 py-1 text-center">-</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
