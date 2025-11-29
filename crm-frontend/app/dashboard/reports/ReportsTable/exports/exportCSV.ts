import { columnDefs } from "../utils/columnDefs";

/**
 * Export CSV with:
 * - Only visible columns
 * - UI-style formatting
 * - TOTAL row with sums for all money / numeric columns
 */
export function exportCSV(
  rows: any[],
  totals: any,
  visible: Record<string, boolean>
) {

    // 🔥 Only export closed jobs
  rows = rows.filter((r) => r.jobStatus?.name === "Closed");
  
  const activeCols = columnDefs.filter((c) => visible[c.key]);

  const header = activeCols.map((c) => safeCSV(c.label)).join(",");

  const csvRows = rows.map((job) =>
    activeCols.map((col) => safeCSV(formatCell(job, col.key))).join(",")
  );

  const totalsRow = activeCols
    .map((col) => {
      const totalVal = getColumnTotal(col.key, rows, totals);
      return safeCSV(formatTotalCell(col.key, totalVal));
    })
    .join(",");

  const finalCSV = [header, ...csvRows, totalsRow].join("\n");

  const blob = new Blob([finalCSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------
   FIELD DEFINITIONS
------------------------------------------------------------------- */

// Columns treated as money in USD
const moneyFields = new Set<string>([
  "total",
  "cashTotal",
  "creditTotal",
  "checkTotal",
  "zelleTotal",
  "techParts",
  "leadParts",
  "compParts",
  "partsAmt",
  "cc",
  "addFee",
  "adjusted",
  "techProfit",
  "leadProfit",
  "compProfit",
  "techBal",
  "leadBal",
  "compBal",
]);

// Columns treated as percentages
const percentFields = new Set<string>(["tech%", "lead%", "comp%"]);

// Columns treated as generic numeric (4 decimals)
const numericFields = new Set<string>(["check"]);

/* ------------------------------------------------------------------
   FORMATTERS
------------------------------------------------------------------- */

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function fmtMoney(v: any) {
  if (v == null || v === "") return "";
  return usd.format(Number(v));
}

function fmtPercent(v: any) {
  if (v == null || v === "") return "";
  return `${Number(v).toFixed(1)}%`;
}

function fmtCheck(v: any) {
  if (v == null || v === "") return "";
  return Number(v).toFixed(4);
}

/* ------------------------------------------------------------------
   CELL FORMATTING (ROW)
------------------------------------------------------------------- */

function formatCell(job: any, key: string) {
  const c = job.closing || {};

  const rawMap: any = {
    invoice: c.invoiceNumber,
    jobId: job.shortId,
    name: job.customerName,
    address: job.customerAddress,
    date: job.closedAt
      ? new Date(job.closedAt).toLocaleDateString()
      : "",

    type: job.jobType?.name,
    tech: job.technician?.name,

    total: c.totalAmount,
    cashTotal: c.cashTotal,
    creditTotal: c.creditTotal,
    checkTotal: c.checkTotal,
    zelleTotal: c.zelleTotal,
    techParts: c.techParts,
    leadParts: c.leadParts,
    compParts: c.companyParts,
    partsAmt: c.totalParts,
    cc: c.totalCcFee,
    addFee: c.leadAdditionalFee,
    adjusted: c.adjustedTotal,

    "tech%": c.techPercent,
    techProfit: c.techProfit,
    "lead%": c.leadPercent,
    leadProfit: c.leadProfit,
    "comp%": c.companyPercent,
    compProfit: c.companyProfitDisplay,

    techBal: c.techBalance,
    leadBal: c.leadBalance,
    compBal: c.companyBalance,

    check: c.sumCheck,
  };

  const raw = rawMap[key];

  if (raw == null) return "";

  if (moneyFields.has(key)) return fmtMoney(raw);
  if (percentFields.has(key)) return fmtPercent(raw);
  if (numericFields.has(key)) return fmtCheck(raw);

  return raw;
}

/* ------------------------------------------------------------------
   TOTAL ROW HELPERS
------------------------------------------------------------------- */

function getRawNumeric(job: any, key: string): number {
  const c = job.closing || {};

  const rawMap: any = {
    total: c.totalAmount,
    cashTotal: c.cashTotal,
    creditTotal: c.creditTotal,
    checkTotal: c.checkTotal,
    zelleTotal: c.zelleTotal,
    techParts: c.techParts,
    leadParts: c.leadParts,
    compParts: c.companyParts,
    partsAmt: c.totalParts,
    cc: c.totalCcFee,
    addFee: c.leadAdditionalFee,
    adjusted: c.adjustedTotal,
    techProfit: c.techProfit,
    leadProfit: c.leadProfit,
    compProfit: c.companyProfitDisplay,
    techBal: c.techBalance,
    leadBal: c.leadBalance,
    compBal: c.companyBalance,
    check: c.sumCheck,
  };

  const v = rawMap[key];
  if (v == null || v === "") return 0;
  return Number(v);
}

/**
 * Determine the numeric total for a column.
 * Prefer `totals[key]` if available; otherwise compute from rows.
 */
function getColumnTotal(
  key: string,
  rows: any[],
  totals: any
): number | null {
  const hasTotalsObject = totals && Object.prototype.hasOwnProperty.call(totals, key);

  if (hasTotalsObject && totals[key] != null) {
    return Number(totals[key]);
  }

  if (moneyFields.has(key) || numericFields.has(key)) {
    return rows.reduce((sum, job) => sum + getRawNumeric(job, key), 0);
  }

  // For non-numeric / non-money columns we leave total blank
  return null;
}

function formatTotalCell(key: string, totalVal: number | null) {
  if (totalVal == null) {
    // For non-numeric columns, only show label in first column
    if (key === "invoice" || key === "jobId" || key === "name") return "TOTAL";
    return "";
  }

  if (moneyFields.has(key)) return fmtMoney(totalVal);
  if (numericFields.has(key)) return fmtCheck(totalVal);

  return String(totalVal);
}

/* ------------------------------------------------------------------
   CSV ESCAPING
------------------------------------------------------------------- */

function safeCSV(v: any) {
  if (v == null) return "";
  let val = String(v);
  if (val.includes(",") || val.includes('"')) {
    val = `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}