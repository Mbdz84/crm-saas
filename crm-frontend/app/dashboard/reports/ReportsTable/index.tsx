"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import TableHeader from "./TableHeader";
import TableRow from "./TableRow";
import TotalsRow from "./TotalsRow";

import { calculateTotals } from "./utils/totalsCalculator";
import { exportCSV } from "./exports/exportCSV";
import { columnDefs } from "./utils/columnDefs";
import ColumnVisibility from "./ColumnVisibility";
import { exportHTML } from "./exports/exportHTML";

/* -----------------------------------------
   SORTING HELPERS
   Keys MUST match columnDefs keys.
----------------------------------------- */
const NUMERIC_SORT_KEYS = new Set([
  "total", "cashTotal", "creditTotal", "checkTotal", "zelleTotal",
  "techParts", "leadParts", "compParts", "partsAmt", "cc", "addFee",
  "adjusted", "tech%", "techProfit", "lead%", "leadProfit", "comp%",
  "compProfit", "techBal", "leadBal", "compBal", "check",
]);
const DATE_SORT_KEYS = new Set(["date"]);

function paymentSum(c: any, method: string): number {
  if (!Array.isArray(c?.payments)) return 0;
  return c.payments.reduce(
    (s: number, p: any) =>
      s + (p.payment === method ? Number(p.amount) || 0 : 0),
    0
  );
}

function sortValue(job: any, field: string): any {
  const c = job.closing || {};
  switch (field) {
    case "invoice": return c.invoiceNumber ?? "";
    case "jobId": return job.shortId ?? "";
    case "leadSource": return job.source?.name ?? "";
    case "name": return job.customerName ?? "";
    case "phones": return `${job.customerPhone || ""} ${job.customerPhone2 || ""}`;
    case "address": return job.customerAddress ?? "";
    case "date": return new Date(job.closedAt || job.canceledAt || 0).getTime();
    case "type": return job.jobType?.name ?? "";
    case "tech":
    case "technician": return job.technician?.name ?? "";
    case "total": return Number(c.totalAmount) || 0;
    case "cashTotal": return paymentSum(c, "cash");
    case "creditTotal": return paymentSum(c, "credit");
    case "checkTotal": return paymentSum(c, "check");
    case "zelleTotal": return paymentSum(c, "zelle");
    case "techParts": return Number(c.techParts) || 0;
    case "leadParts": return Number(c.leadParts) || 0;
    case "compParts": return Number(c.companyParts) || 0;
    case "partsAmt": return Number(c.totalParts) || 0;
    case "cc": return Number(c.totalCcFee) || 0;
    case "addFee": return Number(c.leadAdditionalFee) || 0;
    case "adjusted": return Number(c.adjustedTotal) || 0;
    case "tech%": return Number(c.techPercent) || 0;
    case "techProfit": return Number(c.techProfit) || 0;
    case "lead%": return Number(c.leadPercent) || 0;
    case "leadProfit": return Number(c.leadProfit) || 0;
    case "comp%": return Number(c.companyPercent) || 0;
    case "compProfit": return Number(c.companyProfitDisplay) || 0;
    case "techBal": return Number(c.techBalance) || 0;
    case "leadBal": return Number(c.leadBalance) || 0;
    case "compBal": return Number(c.companyBalance) || 0;
    case "check": return Number(c.sumCheck) || 0;
    case "cancelReason": return job.canceledReason ?? "";
    default: return "";
  }
}

export default function ReportsTable({
  rows,
  from,
  to,
  expandedTechName,
  expandedSourceName,
  defaultVisibleKeys,
  storageKey = "report_column_defaults",
}: {
  rows: any[];
  from?: string;
  to?: string;
  expandedTechName?: string | null;
  expandedSourceName?: string | null;
  defaultVisibleKeys?: string[];
  storageKey?: string;
}) {
  const [highlighted, setHighlighted] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<string>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showExportMenu, setShowExportMenu] = useState(false);

  /* -----------------------------------------
   COLUMN VISIBILITY

   Initial state is deterministic (system defaults) so server and
   client render match. The saved layout from localStorage is applied
   in an effect after mount — reading localStorage during render caused
   a hydration mismatch that discarded the saved layout, which is why
   "Save as Default" appeared to do nothing.
----------------------------------------- */
function buildDefaultVisibility(): Record<string, boolean> {
  const v: Record<string, boolean> = {};
  if (defaultVisibleKeys?.length) {
    columnDefs.forEach((c) => (v[c.key] = defaultVisibleKeys.includes(c.key)));
  } else {
    columnDefs.forEach((c) => (v[c.key] = true));
  }
  return v;
}

const [visible, setVisible] = useState<Record<string, boolean>>(
  buildDefaultVisibility
);
const [showColumns, setShowColumns] = useState(false);
const columnsRef = useRef<HTMLDivElement>(null);

// Close the Columns popup when clicking anywhere outside it.
useEffect(() => {
  if (!showColumns) return;
  function onPointerDown(e: MouseEvent) {
    if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) {
      setShowColumns(false);
    }
  }
  document.addEventListener("mousedown", onPointerDown);
  return () => document.removeEventListener("mousedown", onPointerDown);
}, [showColumns]);

// Apply the user's saved layout (if any) after mount.
// storageKey is per-report, so technician and lead-source layouts are separate.
useEffect(() => {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return;
  try {
    const stored = JSON.parse(saved);
    // New columns absent from an older saved layout default to visible.
    columnDefs.forEach((c) => {
      if (stored[c.key] === undefined) stored[c.key] = true;
    });
    setVisible(stored);
  } catch {
    /* ignore malformed saved layout */
  }
}, [storageKey]);


  function onSort(field: string) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      // Numbers & dates: first click high→low. Text: first click A→Z.
      setSortDir(
        NUMERIC_SORT_KEYS.has(field) || DATE_SORT_KEYS.has(field)
          ? "desc"
          : "asc"
      );
    }
  }

  const sortedRows = useMemo(() => {
    const arr = [...rows];
    const dir = sortDir === "asc" ? 1 : -1;
    const numericSort =
      NUMERIC_SORT_KEYS.has(sortField) || DATE_SORT_KEYS.has(sortField);

    arr.sort((a, b) => {
      if (numericSort) {
        const A = Number(sortValue(a, sortField)) || 0;
        const B = Number(sortValue(b, sortField)) || 0;
        return (A - B) * dir;
      }
      // Text: natural, case-insensitive (handles "123 Main" vs "Main St")
      const A = String(sortValue(a, sortField) ?? "");
      const B = String(sortValue(b, sortField) ?? "");
      return (
        A.localeCompare(B, undefined, { numeric: true, sensitivity: "base" }) *
        dir
      );
    });
    return arr;
  }, [rows, sortField, sortDir]);

  const totals = calculateTotals(sortedRows);

  /* -----------------------------------------
     ROW SELECTION + JOB COUNTERS
  ----------------------------------------- */
  const selectedRows = sortedRows.filter((j: any) => highlighted[j.id]);
  const selectedCount = selectedRows.length;
  const allSelected =
    sortedRows.length > 0 && selectedCount === sortedRows.length;

  function toggleAllRows() {
    setHighlighted(() => {
      if (allSelected) return {};
      const next: Record<string, boolean> = {};
      sortedRows.forEach((j: any) => (next[j.id] = true));
      return next;
    });
  }

  const totalJobs = rows.length;
  const canceledJobs = rows.filter(
    (j: any) =>
      j.jobStatus?.name === "Cancelled" ||
      j.jobStatus?.name === "Canceled" ||
      !!j.canceledAt ||
      !!j.canceledReason
  ).length;
  const closedJobs = totalJobs - canceledJobs;

  return (
    <div className="mt-6">
      <div className="flex justify-between mb-3">
        <div className="relative" ref={columnsRef}>
          <button
            onClick={() => setShowColumns(!showColumns)}
            className="px-3 py-1 text-xs border rounded bg-white"
          >
            Columns
          </button>

          {showColumns && (
            <div className="absolute left-0 top-full mt-1 z-50">
              <ColumnVisibility
                visible={visible}
                setVisible={setVisible}
                columnDefs={columnDefs}
                storageKey={storageKey}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => exportCSV(sortedRows, totals, visible)}
            className="px-3 py-1 text-xs border rounded bg-white"
          >
            Export CSV
          </button>

          <div className="relative">
  <button
    className="px-3 py-1 text-xs border rounded bg-white"
    onClick={() => setShowExportMenu((v) => !v)}
  >
    Export HTML ▾
  </button>

  {showExportMenu && (
    <div className="absolute right-0 mt-1 w-48 bg-white border rounded shadow z-50">
      <button
        className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100"
        onClick={() => {
          exportHTML(
            sortedRows,
            totals,
            visible,
            { from, to, tech: expandedTechName || undefined, source: expandedSourceName || undefined },
            { includeSummary: true }
          );
          setShowExportMenu(false);
        }}
      >
        Export with summary
      </button>

      <button
        className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-100"
        onClick={() => {
          exportHTML(
            sortedRows,
            totals,
            visible,
            { from, to, tech: expandedTechName || undefined, source: expandedSourceName || undefined },
            { includeSummary: false }
          );
          setShowExportMenu(false);
        }}
      >
        Export table only
      </button>
    </div>
  )}
</div>
        </div>
      </div>

      {!rows?.length ? (
  <p className="text-gray-500 text-sm mt-4">No closed jobs.</p>
) : (
  <div className="relative overflow-x-auto border rounded max-w-[1600px]">
    <table className="min-w-[2000px] text-base">
      <TableHeader
        visible={visible}
        sortField={sortField}
        sortDir={sortDir}
        onSort={onSort}
        allSelected={allSelected}
        onToggleAll={toggleAllRows}
      />

      <tbody>
        {sortedRows.map((job: any) => (
          <TableRow
            key={job.id}
            job={job}
            visible={visible}
            highlighted={!!highlighted[job.id]}
            toggleRow={() =>
              setHighlighted((prev) => ({
                ...prev,
                [job.id]: !prev[job.id],
              }))
            }
          />
        ))}

        <TotalsRow rows={sortedRows} visible={visible} />
        <TotalsRow
          rows={selectedRows}
          visible={visible}
          variant="selected"
          label={`Sel ${selectedCount}`}
        />
      </tbody>
    </table>
  </div>
)}

      {/* JOB COUNTER — always visible */}
      <p className="mt-3 text-sm font-semibold">
        Total jobs: {selectedCount}/{totalJobs} ({closedJobs} closed,{" "}
        {canceledJobs} canceled)
      </p>
    </div>
  );
}