"use client";

import { useState } from "react";

type PaymentMethod = "cash" | "credit" | "check" | "zelle";
type Collector = "tech" | "company" | "lead";

interface PaymentRow {
  id: number;
  payment: PaymentMethod;
  collectedBy: Collector;
  amount: string; // string input, parsed as number
  ccFeePct: string; // % only used for credit
}

interface ResultRow {
  id: number;
  payments: PaymentRow[];
  totalAmount: number;
  techParts: number;
  leadParts: number;
  companyParts: number;
  totalParts: number;
  totalCcFee: number;
  techProfit: number;
  leadProfit: number;
  companyProfitDisplay: number;
  companyProfitBase: number;
  techBalance: number;
  leadBalance: number;
  companyBalance: number;
  sumCheck: number;
  leadOwnedByCompany: boolean;
}

export default function TestFormulaPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([
    {
      id: 1,
      payment: "cash",
      collectedBy: "tech",
      amount: "",
      ccFeePct: "0",
    },
  ]);

  // Job-level fields
  const [techPercent, setTechPercent] = useState("30");
  const [leadPercent, setLeadPercent] = useState("50");
  const [companyPercent, setCompanyPercent] = useState("20");

  const [techParts, setTechParts] = useState("0");
  const [leadParts, setLeadParts] = useState("0");
  const [companyParts, setCompanyParts] = useState("0");

  const [includePartsInProfit, setIncludePartsInProfit] = useState(true);
  const [excludeTechFromParts, setExcludeTechFromParts] = useState(false);

  const [overridePercent, setOverridePercent] = useState(false);

  const [leadAdditionalFee, setLeadAdditionalFee] = useState("0");
  const [techPaysAdditionalFee, setTechPaysAdditionalFee] = useState(false);

  const [leadOwnedByCompany, setLeadOwnedByCompany] = useState(false);

  const [rows, setRows] = useState<ResultRow[]>([]);

  function addPaymentRow() {
    setPayments((prev) => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        payment: "cash",
        collectedBy: "tech",
        amount: "",
        ccFeePct: "0",
      },
    ]);
  }

  function updatePayment(id: number, field: keyof PaymentRow, value: string) {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              [field]: value,
              // reset collector when method changes
              ...(field === "payment"
                ? {
                    collectedBy:
                      value === "cash" ? "tech" : "company",
                    ccFeePct:
                      value === "credit" ? p.ccFeePct : "0",
                  }
                : {}),
            }
          : p
      )
    );
  }

  function getCollectorOptions(payment: PaymentMethod): Collector[] {
    switch (payment) {
      case "cash":
        return []; // hidden
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

  function calculate() {
    if (!payments.length) return;

    // 1) Aggregate payments
    let totalAmount = 0;
    let totalCcFee = 0;
    let amountHeldByTech = 0;
    let amountHeldByCompany = 0;
    let amountHeldByLead = 0;

    payments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      totalAmount += amt;

      // who holds this payment?
      if (p.payment === "cash") {
        amountHeldByTech += amt; // cash always tech
      } else {
        if (p.collectedBy === "tech") amountHeldByTech += amt;
        if (p.collectedBy === "company") amountHeldByCompany += amt;
        if (p.collectedBy === "lead") amountHeldByLead += amt;
      }

      // credit card fee
      if (p.payment === "credit") {
        const pct = Number(p.ccFeePct) || 0;
        const fee = (amt * pct) / 100;
        totalCcFee += fee;
      }
    });

    const techPartsVal = Number(techParts) || 0;
    const leadPartsVal = Number(leadParts) || 0;
    const companyPartsVal = Number(companyParts) || 0;
    const totalParts = techPartsVal + leadPartsVal + companyPartsVal;

    // 2) Commission percents
    const tPct = (Number(techPercent) || 0) / 100;
    const lPct = (Number(leadPercent) || 0) / 100;
    const cPct = (Number(companyPercent) || 0) / 100;

    // 3) Bases for split
    // Base for lead + company always subtract ALL parts + cc fees
    const baseForLeadCompany =
      totalAmount - totalParts - totalCcFee;

    // Base for tech:
    // - if excludeTechFromParts = true -> tech ignores company+lead parts
    // - still subtracts tech parts and cc fees
    let baseForTech: number;

    if (excludeTechFromParts) {
      baseForTech =
        totalAmount - techPartsVal - totalCcFee;
    } else {
      baseForTech = baseForLeadCompany;
    }

    // 4) Base profits (without parts add-back, without fees, etc.)
    let techProfit = baseForTech * tPct;
    let leadProfit = baseForLeadCompany * lPct;
    let companyProfitBase = baseForLeadCompany * cPct;

    // 5) Add credit card fees to the collector’s profit
    payments.forEach((p) => {
      if (p.payment !== "credit") return;
      const amt = Number(p.amount) || 0;
      const pct = Number(p.ccFeePct) || 0;
      const fee = (amt * pct) / 100;
      if (!fee) return;

      if (p.collectedBy === "tech") {
        techProfit += fee;
      } else if (p.collectedBy === "company") {
        companyProfitBase += fee;
      } else if (p.collectedBy === "lead") {
        leadProfit += fee;
      }
    });

    // 6) Parts add-back into PROFIT if checkbox is on
    if (includePartsInProfit) {
      techProfit += techPartsVal;
      leadProfit += leadPartsVal;
      companyProfitBase += companyPartsVal;
    }

    // 7) Additional fee from lead source (per job)
    const addFee = Number(leadAdditionalFee) || 0;
    if (addFee !== 0) {
      // lead always gains the fee
      leadProfit += addFee;
      if (techPaysAdditionalFee) {
        techProfit -= addFee;
      } else {
        companyProfitBase -= addFee;
      }
      // note: total profit stays the same (money moves between parties)
    }

    // 8) Lead owned by company → display combined profit
    const companyProfitDisplay = leadOwnedByCompany
      ? companyProfitBase + leadProfit
      : companyProfitBase;

    // 9) Balances based on who holds the money
    // balance = amountHeld - profitShare
    const techBalance = amountHeldByTech - techProfit;
    const leadBalance = amountHeldByLead - leadProfit;
    const companyBalance =
      amountHeldByCompany - companyProfitBase;

    // 10) SUM CHECK
    // Total "true" profit sum uses BASE company profit, not combined
    const totalProfit = techProfit + leadProfit + companyProfitBase;

    // If include parts in profit → totalProfit ≈ totalAmount
    // If not → totalProfit ≈ totalAmount - totalParts
    const expectedTotal = includePartsInProfit
      ? totalAmount
      : totalAmount - totalParts;

    const sumCheck = totalProfit - expectedTotal;

    const newRow: ResultRow = {
      id: rows.length ? rows[rows.length - 1].id + 1 : 1,
      payments: JSON.parse(JSON.stringify(payments)),
      totalAmount,
      techParts: techPartsVal,
      leadParts: leadPartsVal,
      companyParts: companyPartsVal,
      totalParts,
      totalCcFee,
      techProfit,
      leadProfit,
      companyProfitDisplay,
      companyProfitBase,
      techBalance,
      leadBalance,
      companyBalance,
      sumCheck,
      leadOwnedByCompany,
    };

    setRows((prev) => [...prev, newRow]);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-2">
        Test Formula Engine (Multi-Payment)
      </h1>
      <p className="text-sm text-gray-600 mb-4">
        Use this page to simulate different payments, parts, fees and
        commission logic before we build the production reports.
      </p>

      {/* JOB SETTINGS */}
      <div className="border rounded-lg p-4 bg-white space-y-4">
        <h2 className="font-semibold text-lg mb-2">
          Job Settings
        </h2>

        {/* Commission */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">
              Tech %
            </label>
            <input
              className="border p-2 rounded w-full"
              value={techPercent}
              onChange={(e) => setTechPercent(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Lead Source %
            </label>
            <input
              className="border p-2 rounded w-full"
              value={leadPercent}
              onChange={(e) => setLeadPercent(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Company %
            </label>
            <input
              className="border p-2 rounded w-full"
              value={companyPercent}
              onChange={(e) => setCompanyPercent(e.target.value)}
            />
          </div>
        </div>

        {/* Parts row */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">
              Tech Parts ($)
            </label>
            <input
              className="border p-2 rounded w-full"
              value={techParts}
              onChange={(e) => setTechParts(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Lead Source Parts ($)
            </label>
            <input
              className="border p-2 rounded w-full"
              value={leadParts}
              onChange={(e) => setLeadParts(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Company Parts ($)
            </label>
            <input
              className="border p-2 rounded w-full"
              value={companyParts}
              onChange={(e) => setCompanyParts(e.target.value)}
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-4 pt-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includePartsInProfit}
              onChange={(e) =>
                setIncludePartsInProfit(e.target.checked)
              }
            />
            <span>Include parts in profit columns</span>
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={excludeTechFromParts}
              onChange={(e) =>
                setExcludeTechFromParts(e.target.checked)
              }
            />
            <span>Exclude tech from paying company/lead parts</span>
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={overridePercent}
              onChange={(e) =>
                setOverridePercent(e.target.checked)
              }
            />
            <span>Override % validation (allow &gt; 100%)</span>
          </label>
        </div>

        {/* Additional Fee & Ownership */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium mb-1">
              Lead Additional Fee per Job ($)
            </label>
            <input
              className="border p-2 rounded w-full"
              value={leadAdditionalFee}
              onChange={(e) =>
                setLeadAdditionalFee(e.target.value)
              }
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Charged by lead source. Either tech or company absorbs
              it.
            </p>
          </div>

          <div className="flex items-center">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={techPaysAdditionalFee}
                onChange={(e) =>
                  setTechPaysAdditionalFee(e.target.checked)
                }
              />
              <span>Tech pays additional fee</span>
            </label>
          </div>

          <div className="flex items-center">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={leadOwnedByCompany}
                onChange={(e) =>
                  setLeadOwnedByCompany(e.target.checked)
                }
              />
              <span>Lead source owned by company</span>
            </label>
          </div>
        </div>
      </div>

      {/* PAYMENTS SECTION */}
      <div className="border rounded-lg p-4 bg-white space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-lg">
            Payment Blocks (multi-payment)
          </h2>
          <button
            type="button"
            onClick={addPaymentRow}
            className="px-3 py-1 text-sm bg-gray-800 text-white rounded"
          >
            + Add Payment
          </button>
        </div>

        <div className="space-y-3">
          {payments.map((p) => {
            const collectors = getCollectorOptions(p.payment);
            return (
              <div
                key={p.id}
                className="grid grid-cols-5 gap-3 border rounded p-3 bg-gray-50"
              >
                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Method
                  </label>
                  <select
                    className="border p-2 rounded w-full"
                    value={p.payment}
                    onChange={(e) =>
                      updatePayment(
                        p.id,
                        "payment",
                        e.target.value
                      )
                    }
                  >
                    <option value="cash">CASH</option>
                    <option value="credit">CREDIT</option>
                    <option value="check">CHECK</option>
                    <option value="zelle">ZELLE</option>
                  </select>
                </div>

                {/* Collected By (only non-cash) */}
                <div>
                  {p.payment !== "cash" && (
                    <>
                      <label className="block text-xs font-medium mb-1">
                        Credit / Check / Zelle Collected By
                      </label>
                      <select
                        className="border p-2 rounded w-full"
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
                  )}
                  {p.payment === "cash" && (
                    <div className="text-xs text-gray-500 pt-6">
                      Cash → always technician
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Amount ($)
                  </label>
                  <input
                    className="border p-2 rounded w-full"
                    value={p.amount}
                    onChange={(e) =>
                      updatePayment(
                        p.id,
                        "amount",
                        e.target.value
                      )
                    }
                  />
                </div>

                {/* CC Fee % (credit only) */}
                <div>
                  {p.payment === "credit" && (
                    <>
                      <label className="block text-xs font-medium mb-1">
                        CC Fee %
                      </label>
                      <input
                        className="border p-2 rounded w-full"
                        value={p.ccFeePct}
                        onChange={(e) =>
                          updatePayment(
                            p.id,
                            "ccFeePct",
                            e.target.value
                          )
                        }
                      />
                    </>
                  )}
                  {p.payment !== "credit" && (
                    <div className="text-xs text-gray-500 pt-6">
                      No CC fee
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex items-center text-xs text-gray-500">
                  Payment #{p.id}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={calculate}
          className="mt-3 w-full bg-blue-600 text-white p-2 rounded"
        >
          Run Formula (Add Row)
        </button>
      </div>

      {/* RESULT TABLE */}
      <div className="border rounded p-4 bg-white overflow-auto">
        <h2 className="font-semibold mb-3">Result Rows</h2>
        {rows.length === 0 && (
          <p className="text-sm text-gray-500">
            No rows yet. Configure a job above and click{" "}
            <b>Run Formula</b>.
          </p>
        )}

        {rows.length > 0 && (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">#</th>
                <th className="p-2 border">Total $</th>
                <th className="p-2 border">Tech Parts</th>
                <th className="p-2 border">Lead Parts</th>
                <th className="p-2 border">Comp Parts</th>
                <th className="p-2 border">Total Parts</th>
                <th className="p-2 border">Total CC Fee</th>
                <th className="p-2 border">Tech Profit</th>
                <th className="p-2 border">Lead Profit</th>
                <th className="p-2 border">
                  Company Profit
                  <br />
                  (display)
                </th>
                <th className="p-2 border">Tech Balance</th>
                <th className="p-2 border">Lead Balance</th>
                <th className="p-2 border">Company Balance</th>
                <th className="p-2 border">Sum Check</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const sumCheckDisplay = r.leadOwnedByCompany
                  ? `${r.sumCheck.toFixed(2)}*`
                  : r.sumCheck.toFixed(2);

                return (
                  <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                    <td className="border p-2 text-center">
                      <input type="checkbox" className="mr-1" />
                      {r.id}
                    </td>
                    <td className="border p-2">
                      ${r.totalAmount.toFixed(2)}
                    </td>
                    <td className="border p-2">
                      ${r.techParts.toFixed(2)}
                    </td>
                    <td className="border p-2">
                      ${r.leadParts.toFixed(2)}
                    </td>
                    <td className="border p-2">
                      ${r.companyParts.toFixed(2)}
                    </td>
                    <td className="border p-2">
                      ${r.totalParts.toFixed(2)}
                    </td>
                    <td className="border p-2">
                      ${r.totalCcFee.toFixed(2)}
                    </td>
                    <td className="border p-2">
                      ${r.techProfit.toFixed(2)}
                    </td>
                    <td className="border p-2">
                      ${r.leadProfit.toFixed(2)}
                    </td>
                    <td className="border p-2">
                      ${r.companyProfitDisplay.toFixed(2)}
                      {r.leadOwnedByCompany && " *"}
                    </td>

                    {/* balances */}
                    <td
                      className={`border p-2 font-bold ${
                        r.techBalance < 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {r.techBalance.toFixed(2)}
                    </td>
                    <td
                      className={`border p-2 font-bold ${
                        r.leadBalance < 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {r.leadBalance.toFixed(2)}
                    </td>
                    <td
                      className={`border p-2 font-bold ${
                        r.companyBalance < 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {r.companyBalance.toFixed(2)}
                    </td>

                    <td
                      className={`border p-2 ${
                        Math.abs(r.sumCheck) < 0.01
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {sumCheckDisplay}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {rows.length > 0 && (
          <div className="text-[11px] text-gray-500 mt-3 space-y-1">
            <p>
              Balance color rule:{" "}
              <span className="text-green-600 font-semibold">
                positive
              </span>{" "}
              = entity owes company,{" "}
              <span className="text-red-600 font-semibold">
                negative
              </span>{" "}
              = company needs to pay that entity.
            </p>
            <p>
              Sum Check ≈ 0 means internal math is consistent. Small
              rounding noise is OK.
            </p>
            <p>
              * When <b>Lead owned by Company</b> is checked,
              company profit column shows company + lead combined,
              while sum check still uses internal base company
              profit. So <b>sumCheck*</b> may not be 0 by design.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}