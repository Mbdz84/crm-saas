import { formatInTimeZone } from "date-fns-tz";
import { money } from "./utils/money";
import { balanceColor } from "./utils/balanceColor";

const DEFAULT_TZ = "America/Chicago";

// Show the date in the job's own timezone (date only).
// The underlying value still carries the full timestamp — only the
// displayed text is trimmed to the date.
function jobDateTime(date: any, tz?: string) {
  if (!date) return "-";
  return formatInTimeZone(new Date(date), tz || DEFAULT_TZ, "MM/dd/yyyy");
}

export default function TableRow({
  job,
  highlighted,
  toggleRow,
  visible,
  showSettled = false,
  settled,
}: {
  job: any;
  highlighted: boolean;
  toggleRow: (id: string) => void;
  visible: Record<string, boolean>;
  showSettled?: boolean;
  settled?: { paid?: boolean } | undefined;
}) {
  const c = job.closing;

  const isCancelled =
  job.jobStatus?.name === "Cancelled" ||
  job.jobStatus?.name === "Canceled";

const bg = highlighted
  ? "bg-green-100"
  : isCancelled
  ? "bg-red-50 text-red-800"
  : "bg-white dark:bg-gray-900";

  const shortId = job.shortId; // 🔥 always use shortId

  /* ------------------------------------------
     HANDLE ROW CLICK (settings controlled)
  ------------------------------------------ */
  function handleRowClick(e: any) {
    // ignore checkbox clicks
    if ((e.target as HTMLElement).tagName.toLowerCase() === "input") return;

    // Report rows always open the job in a new tab.
    window.open(`/dashboard/jobs/${shortId}`, "_blank");
  }

  /* ------------------------------------------
     🔥 AUTO-CALCULATE PAYMENT TOTALS
     backend does NOT return cashTotal / creditTotal / checkTotal / zelleTotal
  ------------------------------------------ */
  let cashTotal = 0;
  let creditTotal = 0;
  let checkTotal = 0;
  let zelleTotal = 0;

  if (c?.payments && Array.isArray(c.payments)) {
    c.payments.forEach((p: any) => {
      const amt = Number(p.amount) || 0;
      if (p.payment === "cash") cashTotal += amt;
      if (p.payment === "credit") creditTotal += amt;
      if (p.payment === "check") checkTotal += amt;
      if (p.payment === "zelle") zelleTotal += amt;
    });
  }

  return (
    <tr
  onClick={handleRowClick}
  className={`cursor-pointer ${
    highlighted
      ? "bg-green-100 border border-gray-400"
      : isCancelled
      ? "bg-red-50 text-red-800 border border-gray-400 border-l-4 border-l-red-500 hover:bg-red-100"
      : "bg-white dark:bg-gray-900 border border-gray-300 hover:bg-blue-50"
  }`}
>
      <td
  onClick={(e) => e.stopPropagation()}
  className={`w-6 p-0 text-center sticky left-0 z-10 ${
    isCancelled
      ? "border border-gray-400 bg-red-50"
      : "border border-gray-700 bg-white"
  }`}
>
        <input
          type="checkbox"
          className="h-5 w-5 m-0 block mx-auto cursor-pointer"
          checked={highlighted}
          onChange={() => toggleRow(job.id)}
        />
      </td>

      {/* Settled (per-party) — only on the standalone entity report */}
      {showSettled && (
        <td
          onClick={(e) => e.stopPropagation()}
          className={`border px-2 py-1 text-center whitespace-nowrap sticky left-6 z-10 ${
            isCancelled ? "bg-red-50" : "bg-white"
          }`}
        >
          {settled ? (
            settled.paid ? (
              <span className="text-green-700 font-semibold">✓ Paid</span>
            ) : (
              <span className="text-amber-600 font-semibold">✓ Settled</span>
            )
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>
      )}

      {visible.invoice && (
        <td className="border px-2 py-1">{c?.invoiceNumber || "-"}</td>
      )}

      {visible.jobId && (
        <td className="border px-2 py-1">{job.shortId}</td>
      )}

      {visible.leadSource && (
        <td className="border px-2 py-1">{job.source?.name || "-"}</td>
      )}

      {visible.name && (
        <td className="border px-2 py-1">{job.customerName}</td>
      )}

      {visible.phones && (
  <td className="border px-2 py-1 whitespace-pre-line">
    {(job.customerPhone || "") +
      (job.customerPhone2 ? "\n" + job.customerPhone2 : "") ||
      "-"}
  </td>
)}

      {visible.address && (
        <td className="border px-2 py-1">{job.customerAddress}</td>
      )}

      {visible.date && (
  <td className="border px-2 py-1 whitespace-nowrap">
    {job.jobStatus?.name === "Canceled" || job.jobStatus?.name === "Cancelled"
      ? jobDateTime(job.canceledAt, job.timezone)
      : jobDateTime(job.closedAt, job.timezone)}
  </td>
)}

      {visible.type && (
        <td className="border px-2 py-1">{job.jobType?.name || "-"}</td>
      )}

      {visible.tech && (
        <td className="border px-2 py-1">{job.technician?.name || "—"}</td>
      )}

      {visible.technician && (
        <td className="border px-2 py-1">{job.technician?.name || "—"}</td>
      )}

      {visible.total && (
        <td className="border px-2 py-1">{money(c?.totalAmount)}</td>
      )}

      {/* 🔥 NEW PAYMENT COLUMNS — NOW USING AUTO-CALCULATED VALUES */}
      {visible.cashTotal && (
        <td className="border px-2 py-1">{money(cashTotal)}</td>
      )}

      {visible.creditTotal && (
        <td className="border px-2 py-1">{money(creditTotal)}</td>
      )}

      {visible.checkTotal && (
        <td className="border px-2 py-1">{money(checkTotal)}</td>
      )}

      {visible.zelleTotal && (
        <td className="border px-2 py-1">{money(zelleTotal)}</td>
      )}

      {visible.techParts && (
        <td className="border px-2 py-1">{money(c?.techParts)}</td>
      )}

      {visible.leadParts && (
        <td className="border px-2 py-1">{money(c?.leadParts)}</td>
      )}

      {visible.compParts && (
        <td className="border px-2 py-1">{money(c?.companyParts)}</td>
      )}

      {visible.partsAmt && (
        <td className="border px-2 py-1">{money(c?.totalParts)}</td>
      )}

      {visible.cc && (
        <td className="border px-2 py-1">{money(c?.totalCcFee)}</td>
      )}

      {visible.addFee && (
        <td className="border px-2 py-1">{money(c?.leadAdditionalFee)}</td>
      )}

      {visible.adjusted && (
        <td className="border px-2 py-1">{money(c?.adjustedTotal)}</td>
      )}

      {visible["tech%"] && (
        <td className="border px-2 py-1">{c?.techPercent ?? "-"}%</td>
      )}

      {visible.techProfit && (
        <td className="border px-2 py-1">{money(c?.techProfit)}</td>
      )}

      {visible["lead%"] && (
        <td className="border px-2 py-1">{c?.leadPercent ?? "-"}%</td>
      )}

      {visible.leadProfit && (
        <td className="border px-2 py-1">{money(c?.leadProfit)}</td>
      )}

      {visible["comp%"] && (
        <td className="border px-2 py-1">{c?.companyPercent ?? "-"}%</td>
      )}

      {visible.compProfit && (
        <td className="border px-2 py-1">{money(c?.companyProfitDisplay)}</td>
      )}

      {visible.techBal && (
        <td
          className={`border border-gray-700 px-2 py-1 ${balanceColor(
            c?.techBalance
          )}`}
        >
          {money(c?.techBalance)}
        </td>
      )}

      {visible.leadBal && (
        <td
          className={`border border-gray-700 px-2 py-1 ${balanceColor(
            c?.leadBalance
          )}`}
        >
          {money(c?.leadBalance)}
        </td>
      )}

      {visible.compBal && (
        <td
          className={`border border-gray-700 px-2 py-1 ${balanceColor(
            c?.companyBalance
          )}`}
        >
          {money(c?.companyBalance)}
        </td>
      )}

      {visible.check && (
        <td
          className={`border border-gray-700 px-2 py-1 ${
            Number(c?.sumCheck) === 0
              ? "text-green-700"
              : "text-red-600 font-bold"
          }`}
        >
          {c?.sumCheck}
        </td>
      )}
      {visible.cancelReason && (
  <td className="border px-2 py-1 text-sm text-red-700">
    {isCancelled ? job.canceledReason || "—" : "—"}
  </td>
)}
    </tr>
  );
}