import { money } from "./utils/money";

export default function TotalsRow({
  totals,
  visible,
}: {
  totals: any;
  visible: Record<string, boolean>;
}) {
  return (
    <tr className="bg-gray-200 font-bold border-t-4 border-black">
      <td className="px-2 py-2 sticky left-0 bg-gray-200"></td>

      {visible.invoice && <td className="px-2 py-2">TOTAL</td>}
      {visible.jobId && <td></td>}
      {visible.name && <td></td>}
      {visible.address && <td></td>}
      {visible.date && <td></td>}
      {visible.type && <td></td>}
      {visible.tech && <td></td>}

      {visible.totalAmount && (
        <td className="px-2 py-2">{money(totals.totalAmount)}</td>
      )}

      {/* 🔥 NEW PAYMENT TOTALS */}
      {visible.cashTotal && (
        <td className="px-2 py-2">{money(totals.cashTotal)}</td>
      )}
      {visible.creditTotal && (
        <td className="px-2 py-2">{money(totals.creditTotal)}</td>
      )}
      {visible.checkTotal && (
        <td className="px-2 py-2">{money(totals.checkTotal)}</td>
      )}
      {visible.zelleTotal && (
        <td className="px-2 py-2">{money(totals.zelleTotal)}</td>
      )}

      {visible.techParts && (
        <td className="px-2 py-2">{money(totals.techParts)}</td>
      )}
      {visible.leadParts && (
        <td className="px-2 py-2">{money(totals.leadParts)}</td>
      )}
      {visible.companyParts && (
        <td className="px-2 py-2">{money(totals.companyParts)}</td>
      )}
      {visible.totalParts && (
        <td className="px-2 py-2">{money(totals.totalParts)}</td>
      )}

      {visible.ccFee && (
        <td className="px-2 py-2">{money(totals.ccFee)}</td>
      )}
      {visible.addFee && (
        <td className="px-2 py-2">{money(totals.addFee)}</td>
      )}

      {visible.adjustedTotal && (
        <td className="px-2 py-2">{money(totals.adjustedTotal)}</td>
      )}

      {visible.techPercent && <td></td>}
      {visible.techProfit && (
        <td className="px-2 py-2">{money(totals.techProfit)}</td>
      )}

      {visible.leadPercent && <td></td>}
      {visible.leadProfit && (
        <td className="px-2 py-2">{money(totals.leadProfit)}</td>
      )}

      {visible.companyPercent && <td></td>}
      {visible.companyProfit && (
        <td className="px-2 py-2">{money(totals.companyProfit)}</td>
      )}

      {visible.techBalance && (
        <td className="px-2 py-2">{money(totals.techBalance)}</td>
      )}
      {visible.leadBalance && (
        <td className="px-2 py-2">{money(totals.leadBalance)}</td>
      )}
      {visible.companyBalance && (
        <td className="px-2 py-2">{money(totals.companyBalance)}</td>
      )}

      {visible.sumCheck && (
        <td className="px-2 py-2">{totals.sumCheck.toFixed(4)}</td>
      )}
    </tr>
  );
}