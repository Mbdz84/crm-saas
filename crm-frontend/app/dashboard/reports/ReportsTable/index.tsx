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
      setSortDir("desc");
    }
  }

  /* -----------------------------------------
     VALUE EXTRACTOR INCLUDING NEW PAYMENT FIELDS
  ----------------------------------------- */
  function extractValue(job: any, field: string) {
  const c = job.closing || {};

  const map: Record<string, any> = {
    invoice: c.invoiceNumber,
    jobId: job.shortId,
    leadSource: job.source?.name,

    // ✅ FIXED (must match columnDefs)
    customerName: job.customerName,

    // ⭐ NEW PHONES FIELD
    phones: `${job.customerPhone || ""}${job.customerPhone2 ? " | " + job.customerPhone2 : ""}`,

    address: job.customerAddress,
    date: job.closedAt,
    jobType: job.jobType?.name,
    collectedBy: job.technician?.name,
    technician: job.technician?.name,
    totalAmount: c.totalAmount,

    cashTotal: c.cashTotal,
    creditTotal: c.creditTotal,
    checkTotal: c.checkTotal,
    zelleTotal: c.zelleTotal,

    techParts: c.techParts,
    leadParts: c.leadParts,
    companyParts: c.companyParts,
    totalParts: c.totalParts,
    ccFee: c.totalCcFee,
    addFee: c.leadAdditionalFee,
    adjustedTotal: c.adjustedTotal,
    techPercent: c.techPercent,
    techProfit: c.techProfit,
    leadPercent: c.leadPercent,
    leadProfit: c.leadProfit,
    companyPercent: c.companyPercent,
    companyProfit: c.companyProfitDisplay,

    techBalance: c.techBalance,
    leadBalance: c.leadBalance,
    companyBalance: c.companyBalance,
    sumCheck: c.sumCheck,
  };

  let value = map[field];
  if (value == null) return 0;

  if (field === "date") return new Date(value).getTime();
  return Number(value) || value;
}

  const sortedRows = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const A = extractValue(a, sortField);
      const B = extractValue(b, sortField);

      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, sortField, sortDir]);

  const totals = calculateTotals(sortedRows);

  /* -----------------------------------------
     ROW SELECTION + JOB COUNTERS
  ----------------------------------------- */
  const selectedCount = sortedRows.filter((j: any) => highlighted[j.id]).length;
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