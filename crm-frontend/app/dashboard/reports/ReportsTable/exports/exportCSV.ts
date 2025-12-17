import { columnDefs } from "../utils/columnDefs";

/**
 * Export CSV with:
 * - Only visible columns
 * - UI-style formatting
 * - CLOSED jobs only
 * - Correct payment totals (cash / credit / check / zelle)
 * - Job counts footer
 */
export function exportCSV(
  rows: any[],
  totals: any,
  visible: Record<string, boolean>
) {
  // 🔥 CLOSED JOBS ONLY (matches UI + HTML)
  const closedRows = rows.filter(
    (r) => r.jobStatus?.name === "Closed"
  );

  const activeCols = columnDefs.filter((c) => visible[c.key]);

  const header = activeCols.map((c) => safeCSV(c.label)).join(",");

  const csvRows = closedRows.map((job) =>
    activeCols.map((col) => safeCSV(formatCell(job, col.key))).join(",")
  );

  const totalsRow = activeCols
    .map((col) => {
      const totalVal = getColumnTotal(col.key, closedRows, totals);
      return safeCSV(formatTotalCell(col.key, totalVal));
    })
    .join(",");

  // ---- JOB COUNTS ----
  const totalJobs = rows.length;
  const canceledJobs = rows.filter(isCancelled).length;
  const closedJobs = totalJobs - canceledJobs;

  const jobCountText = `Total jobs: ${totalJobs} (${closedJobs} closed, ${canceledJobs} canceled)`;

// Put text in FIRST column, rest empty
const jobCountRow =
  safeCSV(jobCountText) +
  ",".repeat(activeCols.length - 1);

const finalCSV = [
  header,
  ...csvRows,
  totalsRow,
  jobCountRow,
].join("\n");

  const blob = new Blob([finalCSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------
   HELPERS
------------------------------------------------------------------- */

function isCancelled(job: any): boolean {
  return (
    job.jobStatus?.name === "Canceled" ||
    job.jobStatus?.name === "Cancelled"
  );
}

function computePayments(job: any) {
  let cash = 0;
  let credit = 0;
  let check = 0;
  let zelle = 0;

  const payments = job.closing?.payments;
  if (Array.isArray(payments)) {
    payments.forEach((p: any) => {
      const amt = Number(p.amount) || 0;
      if (p.payment === "cash") cash += amt;
      if (p.payment === "credit") credit += amt;
      if (p.payment === "check") check += amt;
      if (p.payment === "zelle") zelle += amt;
    });
  }

  return { cash, credit, check, zelle };
}

/* ------------------------------------------------------------------
   FIELD DEFINITIONS
------------------------------------------------------------------- */

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

const percentFields = new Set<string>(["tech%", "lead%", "comp%"]);
const numericFields = new Set<string>(["check"]);

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
   CELL FORMATTING
------------------------------------------------------------------- */

function formatCell(job: any, key: string) {
  const c = job.closing || {};
  const payments = computePayments(job);

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
    cashTotal: payments.cash,
    creditTotal: payments.credit,
    checkTotal: payments.check,
    zelleTotal: payments.zelle,

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
   TOTALS
------------------------------------------------------------------- */

function getRawNumeric(job: any, key: string): number {
  const c = job.closing || {};
  const payments = computePayments(job);

  const rawMap: any = {
    total: c.totalAmount,
    cashTotal: payments.cash,
    creditTotal: payments.credit,
    checkTotal: payments.check,
    zelleTotal: payments.zelle,

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
  return v == null ? 0 : Number(v);
}

function getColumnTotal(
  key: string,
  rows: any[],
  totals: any
): number | null {
  if (totals && totals[key] != null) {
    return Number(totals[key]);
  }

  if (moneyFields.has(key) || numericFields.has(key)) {
    return rows.reduce((sum, job) => sum + getRawNumeric(job, key), 0);
  }

  return null;
}

function formatTotalCell(key: string, totalVal: number | null) {
  if (totalVal == null) {
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