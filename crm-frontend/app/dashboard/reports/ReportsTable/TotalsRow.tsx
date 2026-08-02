import { money } from "./utils/money";
import { columnDefs } from "./utils/columnDefs";

type Props = {
  rows: any[];
  visible: Record<string, boolean>;
  variant?: "total" | "selected";
  label?: string;
  showSettled?: boolean;
};

const MONEY_KEYS = new Set([
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

const NUMBER_KEYS = new Set(["check"]);

export default function TotalsRow({
  rows,
  visible,
  variant = "total",
  label,
  showSettled = false,
}: Props) {
  // Grand total hides when there are no rows; the selected row always shows.
  if (!rows.length && variant !== "selected") return null;

  const isSelected = variant === "selected";
  const bg = isSelected ? "bg-blue-100" : "bg-gray-200";
  const rowClass = isSelected
    ? "bg-blue-100 font-bold border-t-2 border-blue-500"
    : "bg-gray-200 font-bold border-t-4 border-black";

  // ✅ Totals are ONLY for closed jobs
  const closedRows = rows.filter(
    (r) => r.jobStatus?.name === "Closed"
  );

    function sum(key: string): number {
    return closedRows.reduce((acc, job) => {
      const c = job.closing || {};

      // ✅ same logic as TableRow: derive payment totals from payments[]
      let cashTotal = 0;
      let creditTotal = 0;
      let checkTotal = 0;
      let zelleTotal = 0;

      if (Array.isArray(c.payments)) {
        c.payments.forEach((p: any) => {
          const amt = Number(p.amount) || 0;
          if (p.payment === "cash") cashTotal += amt;
          if (p.payment === "credit") creditTotal += amt;
          if (p.payment === "check") checkTotal += amt;
          if (p.payment === "zelle") zelleTotal += amt;
        });
      } else {
        // fallback if backend ever sends these
        cashTotal = Number(c.cashTotal || 0);
        creditTotal = Number(c.creditTotal || 0);
        checkTotal = Number(c.checkTotal || 0);
        zelleTotal = Number(c.zelleTotal || 0);
      }

      const map: Record<string, any> = {
        total: c.totalAmount,

        cashTotal,
        creditTotal,
        checkTotal,
        zelleTotal,

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

        // ⚠️ use sumCheck (your TableRow uses c?.sumCheck)
        check: c.sumCheck,
      };

      return acc + Number(map[key] || 0);
    }, 0);
  }

  return (
    <tr className={rowClass}>
      {/* Sticky checkbox column (holds the label for the selected row) */}
      <td
        className={`sticky left-0 ${bg} border px-1 py-2 z-10 whitespace-nowrap text-xs`}
      >
        {label}
      </td>

      {showSettled && (
        <td className={`sticky left-6 ${bg} border px-2 py-2 z-10`}></td>
      )}

      {columnDefs.map((col) => {
        if (!visible[col.key]) return null;

        // 💰 Money totals
        if (MONEY_KEYS.has(col.key)) {
          return (
            <td key={col.key} className="border px-2 py-2">
              {money(sum(col.key))}
            </td>
          );
        }

        // 🔢 Numeric (check)
        if (NUMBER_KEYS.has(col.key)) {
          return (
            <td key={col.key} className="border px-2 py-2">
              {sum(col.key).toFixed(4)}
            </td>
          );
        }

        // ⛔ Everything else → empty cell
        return <td key={col.key} className="border px-2 py-2"></td>;
      })}
    </tr>
  );
}