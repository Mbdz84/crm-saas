"use client";

import { useState } from "react";

type PaymentType = "cash" | "credit" | "check" | "zelle";
type CollectorType = "tech" | "company" | "lead";
type PartsOwnerType = "none" | "tech" | "lead" | "company";

export default function TestFormulaPage() {
  const [rows, setRows] = useState<any[]>([]);

  const [form, setForm] = useState({
    payment: "cash" as PaymentType,
    collectedBy: "tech" as CollectorType,
    amount: "",
    partsOwner: "none" as PartsOwnerType,
    partsValue: "",
    techPercent: "30",
    leadPercent: "50",
    companyPercent: "20",
    ccFeePercent: "0",
  });

  const paymentOptions: PaymentType[] = ["cash", "credit", "check", "zelle"];

  // COLLECTED BY OPTIONS PER PAYMENT TYPE
  function getCollectorOptions(): CollectorType[] {
    switch (form.payment) {
      case "cash":
        return []; // hidden
      case "credit":
        return ["tech", "company", "lead"]; // ALL
      case "check":
        return ["company", "lead"]; // NO TECH
      case "zelle":
        return ["company", "lead"]; // NO TECH
      default:
        return [];
    }
  }

  const collectorOptions = getCollectorOptions();

  // If payment type changes, reset collectedBy to first valid option
  function handlePaymentChange(nextPayment: PaymentType) {
    const opts =
      nextPayment === "cash" ? [] : getCollectorOptionsFor(nextPayment);

    setForm((prev) => ({
      ...prev,
      payment: nextPayment,
      collectedBy:
        nextPayment === "cash" ? ("tech" as CollectorType) : opts[0],
      // if not credit/check/zelle, reset ccFeePercent
      ccFeePercent:
        nextPayment === "credit" || nextPayment === "check" || nextPayment === "zelle"
          ? prev.ccFeePercent
          : "0",
    }));
  }

  function getCollectorOptionsFor(p: PaymentType): CollectorType[] {
    switch (p) {
      case "cash":
        return [];
      case "credit":
        return ["tech", "company", "lead"];
      case "check":
        return ["company", "lead"];
      case "zelle":
        return ["company", "lead"];
      default:
        return [];
    }
  }

  // CALCULATOR
  function calculate() {
    const jobAmount = Number(form.amount) || 0;
    const partsValue = Number(form.partsValue) || 0;

    // CC FEE applies ONLY to non-cash and when collectedBy is NOT tech
    let ccFeePercent = 0;
    if (form.payment !== "cash" && form.collectedBy !== "tech") {
      ccFeePercent = Number(form.ccFeePercent) || 0;
    }
    const ccFeeAmount = (jobAmount * ccFeePercent) / 100;

    // Adjusted total = total – parts – fee (only on CC/check/zelle)
    const adjustedTotal = jobAmount - partsValue - ccFeeAmount;

    const tPct = (Number(form.techPercent) || 0) / 100;
    const lPct = (Number(form.leadPercent) || 0) / 100;
    const cPct = (Number(form.companyPercent) || 0) / 100;

    // PROFITS (include parts add-back)
    let techProfit = adjustedTotal * tPct;
    let leadProfit = adjustedTotal * lPct;
    let companyProfit = adjustedTotal * cPct;

    // PART OWNERSHIP → profit gets the parts value
    if (form.partsOwner === "tech") techProfit += partsValue;
    if (form.partsOwner === "lead") leadProfit += partsValue;
    if (form.partsOwner === "company") companyProfit += partsValue;

    // BALANCES (who holds the money)
    let techBalance = 0;
    let leadBalance = 0;
    let companyBalance = 0;

    // CASH → tech always holds
    if (form.payment === "cash") {
      techBalance = jobAmount - techProfit;
      leadBalance = -leadProfit;
      companyBalance = -companyProfit;
    } else {
      // CREDIT / CHECK / ZELLE
      if (form.collectedBy === "tech") {
        techBalance = jobAmount - techProfit;
        leadBalance = -leadProfit;
        companyBalance = -companyProfit;
      } else if (form.collectedBy === "company") {
        companyBalance = jobAmount - companyProfit;
        techBalance = -techProfit;
        leadBalance = -leadProfit;
      } else if (form.collectedBy === "lead") {
        leadBalance = jobAmount - leadProfit;
        techBalance = -techProfit;
        companyBalance = -companyProfit;
      }
    }

    // Sum check (should be ≈ 0)
    const sumCheck =
      adjustedTotal - techProfit - leadProfit - companyProfit;

    // Add row
    setRows((prev) => [
      ...prev,
      {
        ...form,
        jobAmount,
        partsValue,
        ccFeePercent,
        ccFeeAmount,
        adjustedTotal,
        techProfit,
        leadProfit,
        companyProfit,
        techBalance,
        leadBalance,
        companyBalance,
        sumCheck,
      },
    ]);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-2">Test Formula Engine</h1>
      <p className="text-sm text-gray-600 mb-4">
        Sandbox to validate split logic for technician / lead source / company.
        Each run adds a new row below. Negative balance = gets paid. Positive
        balance = owes money.
      </p>

      {/* FORM */}
      <div className="grid grid-cols-2 gap-4 border p-4 rounded bg-white">
        {/* Payment Method */}
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">
            Payment Method
          </label>
          <select
            className="border p-2 rounded w-full"
            value={form.payment}
            onChange={(e) => handlePaymentChange(e.target.value as PaymentType)}
          >
            {paymentOptions.map((p) => (
              <option key={p} value={p}>
                {p.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* COLLECTED BY (only non-cash) */}
        {form.payment !== "cash" && (
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              Credit / Check / Zelle Collected By
            </label>
            <select
              className="border p-2 rounded w-full"
              value={form.collectedBy}
              onChange={(e) =>
                setForm({
                  ...form,
                  collectedBy: e.target.value as CollectorType,
                })
              }
            >
              {collectorOptions.map((c) => (
                <option key={c} value={c}>
                  {c === "tech"
                    ? "Technician"
                    : c === "lead"
                    ? "Lead Source"
                    : "Company"}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Amount Collected ($)
          </label>
          <input
            className="border p-2 rounded w-full"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>

        {/* CC FEE (only non-cash & collectedBy != tech) */}
        {form.payment !== "cash" && form.collectedBy !== "tech" && (
          <div>
            <label className="block text-sm font-medium mb-1">
              CC / Check / Zelle Fee (%)
            </label>
            <input
              className="border p-2 rounded w-full"
              value={form.ccFeePercent}
              onChange={(e) =>
                setForm({ ...form, ccFeePercent: e.target.value })
              }
              placeholder="e.g. 3"
            />
          </div>
        )}

        {/* Parts owner */}
        <div>
          <label className="block text-sm font-medium mb-1">Parts Owner</label>
          <select
            className="border p-2 rounded w-full"
            value={form.partsOwner}
            onChange={(e) =>
              setForm({ ...form, partsOwner: e.target.value as PartsOwnerType })
            }
          >
            <option value="none">None</option>
            <option value="tech">Technician</option>
            <option value="lead">Lead Source</option>
            <option value="company">Company</option>
          </select>
        </div>

        {/* Parts value */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Parts Value ($)
          </label>
          <input
            className="border p-2 rounded w-full"
            value={form.partsValue}
            onChange={(e) => setForm({ ...form, partsValue: e.target.value })}
          />
        </div>

        {/* Percentages */}
        <div>
          <label className="block text-sm font-medium mb-1">Tech %</label>
          <input
            className="border p-2 rounded w-full"
            value={form.techPercent}
            onChange={(e) =>
              setForm({ ...form, techPercent: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Lead %</label>
          <input
            className="border p-2 rounded w-full"
            value={form.leadPercent}
            onChange={(e) =>
              setForm({ ...form, leadPercent: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Company %</label>
          <input
            className="border p-2 rounded w-full"
            value={form.companyPercent}
            onChange={(e) =>
              setForm({ ...form, companyPercent: e.target.value })
            }
          />
        </div>

        {/* SUBMIT */}
        <div className="col-span-2">
          <button
            onClick={calculate}
            className="w-full bg-blue-600 text-white p-2 rounded"
          >
            Run Formula (Add Row)
          </button>
        </div>
      </div>

      {/* LEGEND */}
      <div className="text-xs text-gray-500">
        <p>
          <b>Legend:</b> Negative balance (red) = gets paid. Positive balance
          (green) = owes company. Sum Check should be ≈ 0.
        </p>
      </div>

      {/* RESULT TABLE */}
      <div className="border rounded p-4 bg-white overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Payment</th>
              <th className="p-2 border">Collected By</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Parts Owner</th>
              <th className="p-2 border">Parts $</th>
              <th className="p-2 border">CC Fee %</th>
              <th className="p-2 border">CC Fee $</th>
              <th className="p-2 border">Adj Total</th>
              <th className="p-2 border">Tech Profit</th>
              <th className="p-2 border">Lead Profit</th>
              <th className="p-2 border">Company Profit</th>
              <th className="p-2 border">Tech Balance</th>
              <th className="p-2 border">Lead Balance</th>
              <th className="p-2 border">Company Balance</th>
              <th className="p-2 border">Sum Check</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="border p-2">{r.payment}</td>
                <td className="border p-2">{r.collectedBy}</td>
                <td className="border p-2">${r.jobAmount}</td>
                <td className="border p-2">{r.partsOwner}</td>
                <td className="border p-2">${r.partsValue}</td>
                <td className="border p-2">
                  {r.ccFeePercent ? `${r.ccFeePercent}%` : "0%"}
                </td>
                <td className="border p-2">
                  ${r.ccFeeAmount.toFixed(2)}
                </td>
                <td className="border p-2">
                  ${r.adjustedTotal.toFixed(2)}
                </td>
                <td className="border p-2">
                  ${r.techProfit.toFixed(2)}
                </td>
                <td className="border p-2">
                  ${r.leadProfit.toFixed(2)}
                </td>
                <td className="border p-2">
                  ${r.companyProfit.toFixed(2)}
                </td>

                {/* Balances colored */}
                <td
                  className={`border p-2 font-bold ${
                    r.techBalance < 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {r.techBalance.toFixed(2)}
                </td>

                <td
                  className={`border p-2 font-bold ${
                    r.leadBalance < 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {r.leadBalance.toFixed(2)}
                </td>

                <td
                  className={`border p-2 font-bold ${
                    r.companyBalance < 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {r.companyBalance.toFixed(2)}
                </td>

                <td
                  className={`border p-2 font-mono ${
                    Math.abs(r.sumCheck) < 0.01
                      ? "text-gray-500"
                      : "text-red-500"
                  }`}
                >
                  {r.sumCheck.toFixed(4)}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td className="border p-2 text-center text-gray-400" colSpan={15}>
                  Run the formula to see rows here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}