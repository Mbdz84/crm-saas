import { money } from "./utils/money";

type Props = {
  rows: any[];                          // all jobs shown in the table
  visible: Record<string, boolean>;     // visibility map for columns
};

export default function TotalsRow({ rows, visible }: Props) {
  // Only sum CLOSED jobs (same as exportHTML)
  const closedRows = rows.filter(
    (r) => r.jobStatus?.name === "Closed"
  );

  const sum = (fn: (job: any) => number | null | undefined) =>
    closedRows.reduce((acc, job) => {
      const v = fn(job);
      return acc + (v ? Number(v) : 0);
    }, 0);

  // Map to JobClosing fields (same as exportHTML rawMap)
  const total        = sum((j) => j.closing?.totalAmount);
  const cashTotal    = sum((j) => j.closing?.cashTotal);
  const creditTotal  = sum((j) => j.closing?.creditTotal);
  const checkTotal   = sum((j) => j.closing?.checkTotal);
  const zelleTotal   = sum((j) => j.closing?.zelleTotal);

  const techParts    = sum((j) => j.closing?.techParts);
  const leadParts    = sum((j) => j.closing?.leadParts);
  const compParts    = sum((j) => j.closing?.companyParts);
  const partsAmt     = sum((j) => j.closing?.totalParts);

  const cc           = sum((j) => j.closing?.totalCcFee);
  const addFee       = sum((j) => j.closing?.leadAdditionalFee);
  const adjusted     = sum((j) => j.closing?.adjustedTotal);

  const techProfit   = sum((j) => j.closing?.techProfit);
  const leadProfit   = sum((j) => j.closing?.leadProfit);
  const compProfit   = sum((j) => j.closing?.companyProfitDisplay);

  const techBal      = sum((j) => j.closing?.techBalance);
  const leadBal      = sum((j) => j.closing?.leadBalance);
  const compBal      = sum((j) => j.closing?.companyBalance);

  const sumCheck     = sum((j) => j.closing?.sumCheck);

  return (
    <tr className="bg-gray-200 font-bold border-t-4 border-black">
      {/* sticky checkbox column */}
      <td className="px-2 py-2 sticky left-0 bg-gray-200"></td>

      {visible.invoice && <td className="px-2 py-2">TOTAL</td>}
      {visible.jobId && <td></td>}
      {visible.name && <td></td>}
      {visible.address && <td></td>}
      {visible.date && <td></td>}
      {visible.type && <td></td>}
      {visible.tech && <td></td>}

      {/* amounts */}
      {visible.total && (
        <td className="px-2 py-2">{money(total)}</td>
      )}

      {visible.cashTotal && (
        <td className="px-2 py-2">{money(cashTotal)}</td>
      )}
      {visible.creditTotal && (
        <td className="px-2 py-2">{money(creditTotal)}</td>
      )}
      {visible.checkTotal && (
        <td className="px-2 py-2">{money(checkTotal)}</td>
      )}
      {visible.zelleTotal && (
        <td className="px-2 py-2">{money(zelleTotal)}</td>
      )}

      {visible.techParts && (
        <td className="px-2 py-2">{money(techParts)}</td>
      )}
      {visible.leadParts && (
        <td className="px-2 py-2">{money(leadParts)}</td>
      )}
      {visible.compParts && (
        <td className="px-2 py-2">{money(compParts)}</td>
      )}
      {visible.partsAmt && (
        <td className="px-2 py-2">{money(partsAmt)}</td>
      )}

      {visible.cc && (
        <td className="px-2 py-2">{money(cc)}</td>
      )}
      {visible.addFee && (
        <td className="px-2 py-2">{money(addFee)}</td>
      )}
      {visible.adjusted && (
        <td className="px-2 py-2">{money(adjusted)}</td>
      )}

      {/* percentages – we don't total them, just leave empty cells */}
      {visible["tech%"] && <td></td>}
      {visible.techProfit && (
        <td className="px-2 py-2">{money(techProfit)}</td>
      )}

      {visible["lead%"] && <td></td>}
      {visible.leadProfit && (
        <td className="px-2 py-2">{money(leadProfit)}</td>
      )}

      {visible["comp%"] && <td></td>}
      {visible.compProfit && (
        <td className="px-2 py-2">{money(compProfit)}</td>
      )}

      {visible.techBal && (
        <td className="px-2 py-2">{money(techBal)}</td>
      )}
      {visible.leadBal && (
        <td className="px-2 py-2">{money(leadBal)}</td>
      )}
      {visible.compBal && (
        <td className="px-2 py-2">{money(compBal)}</td>
      )}

      {visible.check && (
        <td className="px-2 py-2">{sumCheck.toFixed(4)}</td>
      )}
    </tr>
  );
}