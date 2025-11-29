import { columnDefs } from "../utils/columnDefs";

/* ---------------------------------------------
   FIELD GROUPS (same as CSV)
--------------------------------------------- */

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

function fmtMoney(v: any): string {
  if (v == null || v === "") return "$0.00";
  return usd.format(Number(v));
}

function fmtPercent(v: any): string {
  if (!v && v !== 0) return "0%";
  return `${Number(v).toFixed(2)}%`;
}

function fmtCheck(v: any): string {
  if (!v && v !== 0) return "0.0000";
  return Number(v).toFixed(4);
}

/* ---------------------------------------------
   Extract raw value
--------------------------------------------- */
function extract(job: any, key: string): any {
  const c = job.closing || {};

  const rawMap: any = {
    invoice: c.invoiceNumber,
    jobId: job.shortId,
    name: job.customerName,
    address: job.customerAddress,
    date: job.closedAt ? new Date(job.closedAt).toLocaleDateString() : "",
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

  return rawMap[key];
}

/* ---------------------------------------------
   HTML Cell Formatter
--------------------------------------------- */
function htmlCell(key: string, raw: any): string {
  if (raw == null || raw === "") raw = 0;

  if (moneyFields.has(key)) {
    const num = Number(raw);
    const formatted = fmtMoney(num);

    if (num > 0)
      return `<td><span style="color:#15803d;font-weight:bold;">${formatted}</span></td>`;
    if (num < 0)
      return `<td><span style="color:#b91c1c;font-weight:bold;">-${fmtMoney(Math.abs(num))}</span></td>`;

    return `<td>${formatted}</td>`;
  }

  if (percentFields.has(key)) return `<td>${fmtPercent(raw)}</td>`;
  if (numericFields.has(key)) return `<td>${fmtCheck(raw)}</td>`;

  return `<td>${raw ?? ""}</td>`;
}

/* ---------------------------------------------
   TOTALS
--------------------------------------------- */
function getRawNumeric(job: any, key: string): number {
  const v = extract(job, key);
  return v ? Number(v) : 0;
}

function computeTotal(key: string, rows: any[], totals: any): number | null {
  if (totals && totals[key] != null) return Number(totals[key]);

  if (moneyFields.has(key) || numericFields.has(key)) {
    return rows.reduce((sum, job) => sum + getRawNumeric(job, key), 0);
  }
  return null;
}

function htmlTotalCell(key: string, total: number | null): string {
  if (total == null) return `<td></td>`;

  if (moneyFields.has(key)) {
    const num = total;
    const formatted = fmtMoney(num);

    if (num > 0)
      return `<td style="font-weight:bold;color:#15803d">${formatted}</td>`;
    if (num < 0)
      return `<td style="font-weight:bold;color:#b91c1c">-${fmtMoney(Math.abs(num))}</td>`;

    return `<td style="font-weight:bold;">${formatted}</td>`;
  }

  if (numericFields.has(key))
    return `<td style="font-weight:bold;">${fmtCheck(total)}</td>`;

  return `<td style="font-weight:bold;">${total}</td>`;
}

/* ---------------------------------------------
   EXPORT HTML
--------------------------------------------- */
export function exportHTML(
  rows: any[],
  totals: any,
  visible: Record<string, boolean>,
  meta: { from?: string; to?: string; tech?: string; source?: string }
) {
  // 🔥 Debug totals here
  console.log("EXPORT TOTALS:", totals);


  /* --- Only closed jobs --- */
  rows = rows.filter((r) => r.jobStatus?.name === "Closed");

  const cols = columnDefs.filter((c) => visible[c.key]);

  /* --- Title & filename --- */
  const name =
    (meta.tech && `Technician: ${meta.tech}`) ||
    (meta.source && `Lead Source: ${meta.source}`) ||
    "Report";

  const fmt = (d?: string) => {
    if (!d) return null;
    const dt = new Date(d + "T00:00:00");
    if (isNaN(dt.getTime())) return null;
    return dt.toLocaleDateString("en-US");
  };

  const fromLabel = fmt(meta.from);
  const toLabel = fmt(meta.to);

  let dateText = "All Dates";
  if (fromLabel && toLabel) dateText = `${fromLabel} → ${toLabel}`;
  else if (fromLabel) dateText = fromLabel;

  const title = `${name} | ${dateText}`;

  const safeName = (meta.tech || meta.source || "report")
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase();

  const fileFrom = meta.from ? meta.from.replace(/[^0-9-]/g, "") : "all";
  const fileTo = meta.to ? meta.to.replace(/[^0-9-]/g, "") : "all";

  const filename = `${safeName}-${fileFrom}__${fileTo}.html`;

  /* --- HEADER --- */
  const thead = `
    <thead>
      <tr>
        <th><input type="checkbox" id="check-all" /></th>
        ${cols.map((c) => `<th>${c.label}</th>`).join("")}
      </tr>
    </thead>
  `;

  /* --- BODY --- */
  const tbody = `
    <tbody>
      ${rows
        .map(
          (job, i) => `
      <tr data-row="${i}">
        <td><input type="checkbox" class="row-check" data-row="${i}" /></td>
        ${cols.map((c) => htmlCell(c.key, extract(job, c.key))).join("")}
      </tr>`
        )
        .join("")}
    </tbody>
  `;

  /* --- FOOTER --- */
  const tfoot = `
    <tfoot>
      <tr>
        <td></td>
        ${cols.map((c) => htmlTotalCell(c.key, computeTotal(c.key, rows, totals))).join("")}
      </tr>
    </tfoot>
  `;

  /* --- SUMMARY BOXES --- */
const summaryBoxes = `
<div class="summary-container">

  <div class="summary-box">
    <div class="label">Total Collected</div>
    <div class="value">${fmtMoney(totals.totalAmount || 0)}</div>
  </div>

  <div class="summary-box">
    <div class="label">Profit</div>
    <div class="value">${
      meta.tech
        ? fmtMoney(totals.techProfit || 0)
        : fmtMoney(totals.leadProfit || 0)
    }</div>
  </div>

  <div class="summary-box">
    <div class="label">Balance</div>
    <div class="value">${
      meta.tech
        ? fmtMoney(totals.techBalance || 0)
        : fmtMoney(totals.leadBalance || 0)
    }</div>
  </div>

</div>
`;

  /* --- SCRIPT (safe) --- */
  const script = `
<script>
document.addEventListener("DOMContentLoaded", function () {

  document.querySelectorAll(".row-check").forEach(function (chk) {
    chk.addEventListener("change", function (e) {
      var rowIndex = e.target.getAttribute("data-row");
      var tr = document.querySelector("tr[data-row='" + rowIndex + "']");
      if (tr) {
        if (e.target.checked) tr.classList.add("highlight");
        else tr.classList.remove("highlight");
      }
    });
  });

  var checkAll = document.getElementById("check-all");
  if (checkAll) {
    checkAll.addEventListener("change", function (e) {
      var all = document.querySelectorAll(".row-check");
      all.forEach(function (box) {
        box.checked = e.target.checked;

        var rowIndex = box.getAttribute("data-row");
        var tr = document.querySelector("tr[data-row='" + rowIndex + "']");

        if (tr) {
          if (e.target.checked) tr.classList.add("highlight");
          else tr.classList.remove("highlight");
        }
      });
    });
  }

});
</script>
`;

  /* --- Extra CSS --- */
  const styleExtra = `
<style>
  tr.highlight { background-color: #d1f7d1 !important; }

  .summary-container {
    display:flex;
    gap:20px;
    margin-top:20px;
  }
  .summary-box {
    flex: 1;
    padding:15px;
    border:2px solid black;
    border-radius:6px;
    background:#f8f8f8;
    text-align:center;
  }
  .summary-box .label {
    font-size:16px;
    font-weight:bold;
    margin-bottom:5px;
  }
  .summary-box .value {
    font-size:22px;
    font-weight:bold;
    color:#064e3b;
  }
</style>
`;

  /* --- FINAL HTML OUTPUT --- */
  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
body { font-family: "Times New Roman", serif; margin: 20px; }
h1 { text-align:center; font-size:26px; margin-bottom:10px; }
table { width:100%; border-collapse:collapse; font-size:14px; margin-bottom:20px; }
th,td { border:1px solid black; padding:4px 6px; white-space:nowrap; }
th { border-bottom:3px solid black; }
tfoot td { border-top:3px solid black; font-weight:bold; }
</style>
</head>
<body>

<h1>${title}</h1>

<table>
${thead}
${tbody}
${tfoot}
</table>

${summaryBoxes}
${script}
${styleExtra}

</body>
</html>
`;

  /* --- DOWNLOAD FILE --- */
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}