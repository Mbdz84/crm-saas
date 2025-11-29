"use client";

import { useJob } from "../../state/JobProvider";
import { useJobActions } from "../../state/useJobActions";

export default function PaymentBlocks() {
  const { payments } = useJob();
  const { addPaymentRow, removePaymentRow, updatePayment } = useJobActions();

  function getCollectorOptions(payment: string) {
    switch (payment) {
      case "cash":
        return [];
      case "credit":
        return ["tech", "company", "lead"];
      case "check":
      case "zelle":
        return ["company", "lead"];
      default:
        return [];
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Payment Blocks (Multi-Payment)
        </h3>
        <button
          type="button"
          onClick={addPaymentRow}
          className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
        >
          + Add Payment
        </button>
      </div>

      <div className="space-y-3">
        {payments.map((p: any) => {
          const collectors = getCollectorOptions(p.payment);

          return (
            <div
              key={p.id}
              className="relative grid grid-cols-5 gap-2 border rounded p-2 bg-gray-50 text-xs"
            >
              {/* REMOVE */}
              <button
                type="button"
                onClick={() => removePaymentRow(p.id)}
                className="absolute top-1 right-1 text-red-600 text-[10px] font-bold"
              >
                ✕
              </button>

              {/* Method */}
              <div>
                <label className="block text-[10px] mb-1">Method</label>
                <select
                  className="border rounded px-1 py-1 w-full text-xs bg-white"
                  value={p.payment}
                  onChange={(e) =>
                    updatePayment(p.id, "payment", e.target.value)
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                  <option value="check">Check</option>
                  <option value="zelle">Zelle</option>
                </select>
              </div>

              {/* Collected By */}
              <div>
                {p.payment !== "cash" ? (
                  <>
                    <label className="block text-[10px] mb-1">
                      Collected By
                    </label>
                    <select
                      className="border rounded px-1 py-1 w-full text-xs bg-white"
                      value={p.collectedBy}
                      onChange={(e) =>
                        updatePayment(
                          p.id,
                          "collectedBy",
                          e.target.value
                        )
                      }
                    >
                      {collectors.map((c) => (
                        <option key={c} value={c}>
                          {c === "tech"
                            ? "Technician"
                            : c === "lead"
                            ? "Lead Source"
                            : "Company"}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <div className="text-[10px] text-gray-400 mt-4">
                    Cash → Technician
                  </div>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[10px] mb-1">Amount ($)</label>
                <input
                  className="border rounded px-1 py-1 w-full text-xs bg-white"
                  value={p.amount}
                  onChange={(e) =>
                    updatePayment(p.id, "amount", e.target.value)
                  }
                />
              </div>

              {/* CC Fee */}
              <div>
                {p.payment === "credit" ? (
                  <>
                    <label className="block text-[10px] mb-1">CC Fee %</label>
                    <input
                      className="border rounded px-1 py-1 w-full text-xs bg-white"
                      value={p.ccFeePct}
                      onChange={(e) =>
                        updatePayment(p.id, "ccFeePct", e.target.value)
                      }
                    />
                  </>
                ) : (
                  <div className="text-[10px] text-gray-400 mt-4">
                    No CC Fee
                  </div>
                )}
              </div>

              <div className="text-[10px] text-gray-400 flex items-center">
                Payment #{p.id}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}