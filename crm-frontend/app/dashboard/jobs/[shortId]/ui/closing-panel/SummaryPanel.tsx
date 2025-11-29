"use client";

import next from "next";
import { useJob } from "../../state/JobProvider";

export default function SummaryPanel() {
  const { result } = useJob();

  if (!result) {
    return (
      <div className="border rounded p-3 bg-gray-50 text-xs">
        <p className="text-gray-400 text-[11px]">
          Enter values → press <b>Close Job</b>.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded p-3 bg-gray-50 text-xs space-y-2">
      <h3 className="font-semibold mb-1">Totals & Balances</h3>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div>Total $</div>
          <div className="font-mono">${result.totalAmount.toFixed(2)}</div>
        </div>
        <div>
          <div>Parts $</div>
          <div className="font-mono">${result.totalParts.toFixed(2)}</div>
        </div>
        <div>
          <div>CC Fee $</div>
          <div className="font-mono">${result.totalCcFee.toFixed(2)}</div>
        </div>
        <div>
          <div>Adj Total</div>
          <div className="font-mono">${result.adjustedTotal.toFixed(2)}</div>
        </div>
      </div>

      <div className="border-t my-1"></div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <div>Tech Profit</div>
          <div className="font-mono">${result.techProfit.toFixed(2)}</div>
          <div
            className={`font-mono ${
              result.techBalance < 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            Bal ${result.techBalance.toFixed(2)}
          </div>
        </div>

        <div>
          <div>Lead Profit</div>
          <div className="font-mono">${result.leadProfit.toFixed(2)}</div>
          <div
            className={`font-mono ${
              result.leadBalance < 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            Bal ${result.leadBalance.toFixed(2)}
          </div>
        </div>

        <div>
          <div>Company Profit</div>
          <div className="font-mono">${result.companyProfit.toFixed(2)}</div>
          <div
            className={`font-mono ${
              result.companyBalance < 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            Bal ${result.companyBalance.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="text-[11px] text-gray-500">
        <span className="font-bold">SumCheck:</span>{" "}
        <span
          className={
            Math.abs(result.sumCheck) < 0.01
              ? "text-green-600"
              : "text-red-600"
          }
        >
          {result.sumCheck.toFixed(4)}
        </span>
      </div>
    </div>
  );
}