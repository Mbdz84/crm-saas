"use client";

import { useState, useMemo } from "react";
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
}: {
  rows: any[];
  from?: string;
  to?: string;
  expandedTechName?: string | null;
  expandedSourceName?: string | null;
  defaultVisibleKeys?: string[];
}) {
  const [highlighted, setHighlighted] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<string>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  /* -----------------------------------------
   COLUMN VISIBILITY WITH LOCALSTORAGE DEFAULTS
----------------------------------------- */
let baseVisibility: Record<string, boolean> = {};

// 1️⃣ Try load saved layout  
let saved: string | null = null;
if (typeof window !== "undefined") {
  saved = localStorage.getItem("report_column_defaults");
}

if (saved) {
  try {
    baseVisibility = JSON.parse(saved);
  } catch {
    // corrupted saved layout → fallback
    columnDefs.forEach((c) => (baseVisibility[c.key] = true));
  }
}
// 2️⃣ No saved layout → check system defaultVisibleKeys
else if (defaultVisibleKeys?.length) {
  columnDefs.forEach((c) => {
    baseVisibility[c.key] = defaultVisibleKeys.includes(c.key);
  });
}
// 3️⃣ No defaults → show ALL columns
else {
  columnDefs.forEach((c) => (baseVisibility[c.key] = true));
}

const [visible, setVisible] = useState<Record<string, boolean>>(baseVisibility);
const [showColumns, setShowColumns] = useState(false);

  if (!rows?.length) {
    return <p className="text-gray-500 text-sm mt-4">No closed jobs.</p>;
  }

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
    const closing = job.closing || {};

    const map: Record<string, any> = {
      invoice: closing.invoiceNumber,
      jobId: job.shortId,
      name: job.customerName,
      address: job.customerAddress,
      date: job.closedAt,
      type: job.jobType?.name,
      tech: job.technician?.name,
      totalAmount: closing.totalAmount,

      // NEW PAYMENT COLUMNS
      cashTotal: closing.cashTotal,
      creditTotal: closing.creditTotal,
      checkTotal: closing.checkTotal,
      zelleTotal: closing.zelleTotal,

      techParts: closing.techParts,
      leadParts: closing.leadParts,
      companyParts: closing.companyParts,
      totalParts: closing.totalParts,
      ccFee: closing.totalCcFee,
      addFee: closing.leadAdditionalFee,
      adjustedTotal: closing.adjustedTotal,
      techBalance: closing.techBalance,
      leadBalance: closing.leadBalance,
      compBalance: closing.companyBalance,
      sumCheck: closing.sumCheck,
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

  return (
    <div className="mt-6">
      <div className="flex justify-between mb-3">
        <button
          onClick={() => setShowColumns(!showColumns)}
          className="px-3 py-1 text-xs border rounded bg-white"
        >
          Columns
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => exportCSV(sortedRows, totals, visible)}
            className="px-3 py-1 text-xs border rounded bg-white"
          >
            Export CSV
          </button>

          <button
            onClick={() =>
              exportHTML(sortedRows, totals, visible, {
                from,
                to,
                tech: expandedTechName || undefined,
                source: expandedSourceName || undefined,
              })
            }
            className="px-3 py-1 text-xs border rounded bg-white"
          >
            Export HTML
          </button>
        </div>
      </div>

      {showColumns && (
        <ColumnVisibility
          visible={visible}
          setVisible={setVisible}
          columnDefs={columnDefs}
        />
      )}

      <div className="relative overflow-auto border rounded max-w-[1600px] max-h-[900px]">
        <table className="min-w-[2000px] text-sm">
          <TableHeader
            visible={visible}
            sortField={sortField}
            sortDir={sortDir}
            onSort={onSort}
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

            <TotalsRow totals={totals} visible={visible} />
          </tbody>
        </table>
      </div>
    </div>
  );
}