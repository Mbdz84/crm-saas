"use client";

import { useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


export function ReportsTable({
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

  if (!rows?.length) {
    return (
      <p className="text-gray-500 text-sm mt-4">
        No closed jobs in this date range.
      </p>
    );
  }

  const toggleRow = (id: string) => {
    setHighlighted((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const money = (v: any) =>
    v === null || v === undefined || isNaN(Number(v))
      ? "-"
      : `$${Number(v).toFixed(2)}`;

  const bold = "border border-gray-700 font-semibold";

  const balanceColor = (val: number) =>
    val < 0
      ? "text-red-600 font-semibold"
      : val > 0
      ? "text-green-700 font-semibold"
      : "text-gray-600";

  /* ============================================================
      COMPUTE TOTALS
  ============================================================ */
  const totals = useMemo(() => {
    const sum = {
      totalAmount: 0,
      techParts: 0,
      leadParts: 0,
      companyParts: 0,
      totalParts: 0,
      ccFee: 0,
      addFee: 0,
      adjustedTotal: 0,
      techProfit: 0,
      leadProfit: 0,
      companyProfit: 0,
      techBalance: 0,
      leadBalance: 0,
      companyBalance: 0,
      sumCheck: 0,
    };

    rows.forEach((job: any) => {
      const c = job.closing;
      if (!c) return;

      sum.totalAmount += Number(c.totalAmount || 0);
      sum.techParts += Number(c.techParts || 0);
      sum.leadParts += Number(c.leadParts || 0);
      sum.companyParts += Number(c.companyParts || 0);
      sum.totalParts += Number(c.totalParts || 0);
      sum.ccFee += Number(c.totalCcFee || 0);
      sum.addFee += Number(c.leadAdditionalFee || 0);
      sum.adjustedTotal += Number(c.adjustedTotal || 0);
      sum.techProfit += Number(c.techProfit || 0);
      sum.leadProfit += Number(c.leadProfit || 0);
      sum.companyProfit += Number(c.companyProfitDisplay || 0);
      sum.techBalance += Number(c.techBalance || 0);
      sum.leadBalance += Number(c.leadBalance || 0);
      sum.companyBalance += Number(c.companyBalance || 0);
      sum.sumCheck += Number(c.sumCheck || 0);
    });

    return sum;
  }, [rows]);

  /* ============================================================
      CSV EXPORT
  ============================================================ */
  const csvCell = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const handleExportCSV = () => {
    const headers = [
      "Invoice #",
      "Job ID",
      "Customer Name",
      "Address",
      "Date",
      "Job Type",
      "Collected By",
      "Total Amount",
      "Tech Parts",
      "Lead Parts",
      "Company Parts",
      "Parts Amount",
      "CC Fee $",
      "Additional Fee $",
      "Adjusted Total",
      "Tech %",
      "Tech Profit",
      "Lead %",
      "Lead Profit",
      "Company %",
      "Company Profit",
      "Tech Balance",
      "Lead Balance",
      "Company Balance",
      "Financial Check",
    ];

    const lines: string[] = [];
    lines.push(headers.map(csvCell).join(","));

    rows.forEach((job: any) => {
      const c = job.closing || {};
      lines.push(
        [
          c.invoiceNumber || "",
          job.shortId || "",
          job.customerName || "",
          job.customerAddress || "",
          job.closedAt
            ? new Date(job.closedAt).toLocaleDateString()
            : "",
          job.jobType?.name || "",
          job.technician?.name || "",
          Number(c.totalAmount || 0).toFixed(2),
          Number(c.techParts || 0).toFixed(2),
          Number(c.leadParts || 0).toFixed(2),
          Number(c.companyParts || 0).toFixed(2),
          Number(c.totalParts || 0).toFixed(2),
          Number(c.totalCcFee || 0).toFixed(2),
          Number(c.leadAdditionalFee || 0).toFixed(2),
          Number(c.adjustedTotal || 0).toFixed(2),
          c.techPercent ?? "",
          Number(c.techProfit || 0).toFixed(2),
          c.leadPercent ?? "",
          Number(c.leadProfit || 0).toFixed(2),
          c.companyPercent ?? "",
          Number(c.companyProfitDisplay || 0).toFixed(2),
          Number(c.techBalance || 0).toFixed(2),
          Number(c.leadBalance || 0).toFixed(2),
          Number(c.companyBalance || 0).toFixed(2),
          Number(c.sumCheck || 0).toFixed(4),
        ]
          .map(csvCell)
          .join(",")
      );
    });

    // Totals row
    lines.push(
      [
        "TOTAL",
        "",
        "",
        "",
        "",
        "",
        "",
        totals.totalAmount.toFixed(2),
        totals.techParts.toFixed(2),
        totals.leadParts.toFixed(2),
        totals.companyParts.toFixed(2),
        totals.totalParts.toFixed(2),
        totals.ccFee.toFixed(2),
        totals.addFee.toFixed(2),
        totals.adjustedTotal.toFixed(2),
        "",
        totals.techProfit.toFixed(2),
        "",
        totals.leadProfit.toFixed(2),
        "",
        totals.companyProfit.toFixed(2),
        totals.techBalance.toFixed(2),
        totals.leadBalance.toFixed(2),
        totals.companyBalance.toFixed(2),
        totals.sumCheck.toFixed(4),
      ]
        .map(csvCell)
        .join(",")
    );

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().split("T")[0];
    a.download = `crm-report-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ============================================================
      PDF EXPORT (jsPDF + autoTable)
============================================================ */
const handleExportPDF = () => {
  const doc = new jsPDF("l", "pt", "a4"); // landscape

  // TITLE
  doc.setFontSize(14);
  doc.text("CRM Job Report", 40, 40);

  // Headers (same as table)
  const headers = [
    "Invoice #",
    "Job ID",
    "Customer",
    "Address",
    "Date",
    "Job Type",
    "Tech",
    "Total $",
    "Tech Parts",
    "Lead Parts",
    "Company Parts",
    "Total Parts",
    "CC Fee $",
    "Add Fee $",
    "Adjusted $",
    "Tech %",
    "Tech Profit",
    "Lead %",
    "Lead Profit",
    "Company %",
    "Company Profit",
    "Tech Bal",
    "Lead Bal",
    "Company Bal",
    "Check",
  ];

  // Convert rows → PDF table format
  const body = rows.map((job: any) => {
    const c = job.closing || {};

    return [
      c.invoiceNumber || "",
      job.shortId || "",
      job.customerName || "",
      job.customerAddress || "",
      job.closedAt
        ? new Date(job.closedAt).toLocaleDateString()
        : "",
      job.jobType?.name || "",
      job.technician?.name || "",
      Number(c.totalAmount || 0).toFixed(2),
      Number(c.techParts || 0).toFixed(2),
      Number(c.leadParts || 0).toFixed(2),
      Number(c.companyParts || 0).toFixed(2),
      Number(c.totalParts || 0).toFixed(2),
      Number(c.totalCcFee || 0).toFixed(2),
      Number(c.leadAdditionalFee || 0).toFixed(2),
      Number(c.adjustedTotal || 0).toFixed(2),
      c.techPercent ?? "",
      Number(c.techProfit || 0).toFixed(2),
      c.leadPercent ?? "",
      Number(c.leadProfit || 0).toFixed(2),
      c.companyPercent ?? "",
      Number(c.companyProfitDisplay || 0).toFixed(2),
      Number(c.techBalance || 0).toFixed(2),
      Number(c.leadBalance || 0).toFixed(2),
      Number(c.companyBalance || 0).toFixed(2),
      Number(c.sumCheck || 0).toFixed(4),
    ];
  });

  // Add totals row
  body.push([
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    "",
    totals.totalAmount.toFixed(2),
    totals.techParts.toFixed(2),
    totals.leadParts.toFixed(2),
    totals.companyParts.toFixed(2),
    totals.totalParts.toFixed(2),
    totals.ccFee.toFixed(2),
    totals.addFee.toFixed(2),
    totals.adjustedTotal.toFixed(2),
    "",
    totals.techProfit.toFixed(2),
    "",
    totals.leadProfit.toFixed(2),
    "",
    totals.companyProfit.toFixed(2),
    totals.techBalance.toFixed(2),
    totals.leadBalance.toFixed(2),
    totals.companyBalance.toFixed(2),
    totals.sumCheck.toFixed(4),
  ]);

  autoTable(doc, {
    startY: 60,
    head: [headers],
    body,
    theme: "grid",
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: 20,
      fontSize: 9,
      halign: "center",
    },
    bodyStyles: { fontSize: 8 },
    styles: {
      cellPadding: 3,
      overflow: "linebreak",
    },
    tableWidth: "auto",
  });

  const today = new Date().toISOString().split("T")[0];
  doc.save(`crm-report-${today}.pdf`);
};
  
  /* ============================================================
      PRINT / PDF EXPORT
  ============================================================ */
  const handlePrint = () => {
    window.print(); // user can choose "Save as PDF"
  };

  return (
    <div className="mt-6">
      {/* Toolbar (top-right) */}
      <div className="flex justify-end mb-2 gap-2">
        <button
  onClick={handleExportPDF}
  className="px-3 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100"
>
  Export PDF
</button>
        <button
          onClick={handleExportCSV}
          className="px-3 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100"
        >
          Export CSV
        </button>
      
      </div>

      <div className="relative overflow-x-auto">
        <table className="min-w-[2000px] w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100 sticky top-0 z-20">
            <tr>
              {/* Sticky checkbox header (first column) */}
              <th
                className={`${bold} px-2 py-1 sticky left-0 z-30 bg-gray-100`}
              ></th>
              <th className={`${bold} px-2 py-1`}>Invoice #</th>
              <th className={`${bold} px-2 py-1`}>Job ID</th>
              <th className={`${bold} px-2 py-1`}>Customer Name</th>
              <th className={`${bold} px-2 py-1`}>Address</th>
              <th className={`${bold} px-2 py-1`}>Date</th>
              <th className={`${bold} px-2 py-1`}>Job Type</th>
              <th className={`${bold} px-2 py-1`}>Collected By</th>
              <th className={`${bold} px-2 py-1`}>Total Amount</th>
              <th className={`${bold} px-2 py-1`}>Tech Parts</th>
              <th className={`${bold} px-2 py-1`}>Lead Parts</th>
              <th className={`${bold} px-2 py-1`}>Company Parts</th>
              <th className={`${bold} px-2 py-1`}>Parts Amount</th>
              <th className={`${bold} px-2 py-1`}>CC Fee $</th>
              <th className={`${bold} px-2 py-1`}>Additional Fee $</th>
              <th className={`${bold} px-2 py-1`}>Adjusted Total</th>
              <th className={`${bold} px-2 py-1`}>Tech %</th>
              <th className={`${bold} px-2 py-1`}>Tech Profit</th>
              <th className={`${bold} px-2 py-1`}>Lead %</th>
              <th className={`${bold} px-2 py-1`}>Lead Profit</th>
              <th className={`${bold} px-2 py-1`}>Company %</th>
              <th className={`${bold} px-2 py-1`}>Company Profit</th>
              <th className={`${bold} px-2 py-1`}>Tech Balance</th>
              <th className={`${bold} px-2 py-1`}>Lead Balance</th>
              <th className={`${bold} px-2 py-1`}>Company Balance</th>
              <th className={`${bold} px-2 py-1`}>Financial Check</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((job: any) => {
              const c = job.closing;
              const rowHighlighted = !!highlighted[job.id];

              const rowBg = rowHighlighted
                ? "bg-green-100"
                : "bg-white dark:bg-gray-900";

              const stickyCellBg = rowHighlighted
                ? "bg-green-100"
                : "bg-white dark:bg-gray-900";

              return (
                <tr key={job.id} className={`${rowBg} border`}>
                  {/* Sticky checkbox cell */}
                  <td
                    className={`${bold} px-2 py-1 text-center sticky left-0 z-10 ${stickyCellBg}`}
                  >
                    <input
                      type="checkbox"
                      checked={rowHighlighted}
                      onChange={() => toggleRow(job.id)}
                    />
                  </td>

                  <td className="border px-2 py-1">
                    {c?.invoiceNumber || "-"}
                  </td>

                  <td className="border px-2 py-1">{job.shortId}</td>
                  <td className="border px-2 py-1">{job.customerName}</td>
                  <td className="border px-2 py-1">{job.customerAddress}</td>

                  <td className="border px-2 py-1">
                    {job.closedAt
                      ? new Date(job.closedAt).toLocaleDateString()
                      : "-"}
                  </td>

                  <td className="border px-2 py-1">
                    {job.jobType?.name || "-"}
                  </td>

                  <td className="border px-2 py-1">
                    {job.technician?.name || "—"}
                  </td>

                  <td className="border px-2 py-1">
                    {money(c?.totalAmount)}
                  </td>

                  <td className="border px-2 py-1">{money(c?.techParts)}</td>
                  <td className="border px-2 py-1">{money(c?.leadParts)}</td>
                  <td className="border px-2 py-1">
                    {money(c?.companyParts)}
                  </td>
                  <td className="border px-2 py-1">{money(c?.totalParts)}</td>
                  <td className="border px-2 py-1">{money(c?.totalCcFee)}</td>
                  <td className="border px-2 py-1">
                    {money(c?.leadAdditionalFee)}
                  </td>

                  <td className="border px-2 py-1">
                    {money(c?.adjustedTotal)}
                  </td>

                  <td className="border px-2 py-1">
                    {c?.techPercent ?? "-"}%
                  </td>
                  <td className="border px-2 py-1">{money(c?.techProfit)}</td>

                  <td className="border px-2 py-1">
                    {c?.leadPercent ?? "-"}%
                  </td>
                  <td className="border px-2 py-1">{money(c?.leadProfit)}</td>

                  <td className="border px-2 py-1">
                    {c?.companyPercent ?? "-"}%
                  </td>
                  <td className="border px-2 py-1">
                    {money(c?.companyProfitDisplay)}
                  </td>

                  <td
                    className={`${bold} px-2 py-1 ${balanceColor(
                      Number(c?.techBalance || 0)
                    )}`}
                  >
                    {money(c?.techBalance)}
                  </td>

                  <td
                    className={`${bold} px-2 py-1 ${balanceColor(
                      Number(c?.leadBalance || 0)
                    )}`}
                  >
                    {money(c?.leadBalance)}
                  </td>

                  <td
                    className={`${bold} px-2 py-1 ${balanceColor(
                      Number(c?.companyBalance || 0)
                    )}`}
                  >
                    {money(c?.companyBalance)}
                  </td>

                  <td
                    className={`${bold} px-2 py-1 ${
                      Number(c?.sumCheck || 0) === 0
                        ? "text-green-700"
                        : "text-red-600 font-bold"
                    }`}
                  >
                    {c?.sumCheck}
                  </td>
                </tr>
              );
            })}

            {/* TOTALS ROW */}
            <tr className="bg-gray-200 font-bold border-t-4 border-black">
              <td className="px-2 py-2 sticky left-0 z-10 bg-gray-200"></td>
              <td className="px-2 py-2">TOTAL</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>

              <td className="px-2 py-2">{money(totals.totalAmount)}</td>

              <td className="px-2 py-2">{money(totals.techParts)}</td>
              <td className="px-2 py-2">{money(totals.leadParts)}</td>
              <td className="px-2 py-2">{money(totals.companyParts)}</td>
              <td className="px-2 py-2">{money(totals.totalParts)}</td>

              <td className="px-2 py-2">{money(totals.ccFee)}</td>
              <td className="px-2 py-2">{money(totals.addFee)}</td>

              <td className="px-2 py-2">{money(totals.adjustedTotal)}</td>

              <td></td>
              <td className="px-2 py-2">{money(totals.techProfit)}</td>

              <td></td>
              <td className="px-2 py-2">{money(totals.leadProfit)}</td>

              <td></td>
              <td className="px-2 py-2">{money(totals.companyProfit)}</td>

              <td className="px-2 py-2">{money(totals.techBalance)}</td>
              <td className="px-2 py-2">{money(totals.leadBalance)}</td>
              <td className="px-2 py-2">{money(totals.companyBalance)}</td>

              <td className="px-2 py-2">{totals.sumCheck.toFixed(4)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ReportsTable;