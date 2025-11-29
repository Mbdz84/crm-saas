"use client";

import { useState } from "react";

type PaymentMethod = "cash" | "credit" | "check" | "zelle";
type Collector = "tech" | "company" | "lead";

interface PaymentRow {
  id: number;
  payment: PaymentMethod;
  collectedBy: Collector;
  amount: string;
  ccFeePct: string;
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
  techProfit: number; // display
  leadProfit: number; // display
  companyProfitDisplay: number; // display (may include lead if owned)
  companyProfitBase: number; // internal
  techBalance: number;
  leadBalance: number;
  companyBalance: number;
  sumCheck: number;
  leadOwnedByCompany: boolean;

  // For table
  techPercent: number;
  leadPercent: number;
  companyPercent: number;
  leadAdditionalFee: number;
  techPaysAdditionalFee: boolean;
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

  // Commission %
  const [techPercent, setTechPercent] = useState("30");
  const [leadPercent, setLeadPercent] = useState("50");
  const [companyPercent, setCompanyPercent] = useState("20");

  // Parts
  const [techParts, setTechParts] = useState("0");
  const [leadParts, setLeadParts] = useState("0");
  const [companyParts, setCompanyParts] = useState("0");

  // Settings
  const [includePartsInProfit, setIncludePartsInProfit] = useState(true);
  const [excludeTechFromParts, setExcludeTechFromParts] = useState(false);

  const [leadAdditionalFee, setLeadAdditionalFee] = useState("0");
  const [techPaysAdditionalFee, setTechPaysAdditionalFee] = useState(false);
  const [leadOwnedByCompany, setLeadOwnedByCompany] = useState(false);

  const [rows, setRows] = useState<ResultRow[]>([]);
  const [disableAutoAdjust, setDisableAutoAdjust] = useState(false);

  // ------------ Payment rows ------------
  function removePaymentRow(id: number) {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }

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

  function updatePayment(
    id: number,
    field: keyof PaymentRow,
    value: string
  ) {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              [field]: value,
              ...(field === "payment"
                ? {
                    collectedBy: value === "cash" ? "tech" : "company",
                    ccFeePct: value === "credit" ? p.ccFeePct : "0",
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

  // ------------ % logic (with optional auto-adjust) ------------
  function handlePercentChange(
    field: "tech" | "lead" | "company",
    value: string
  ) {
    if (value === "") {
      if (field === "tech") setTechPercent("");
      if (field === "lead") setLeadPercent("");
      if (field === "company") setCompanyPercent("");
      return;
    }

    const num = Number(value);
    if (isNaN(num)) return;

    if (disableAutoAdjust) {
      if (field === "tech") setTechPercent(value);
      if (field === "lead") setLeadPercent(value);
      if (field === "company") setCompanyPercent(value);
      return;
    }

    if (field === "tech") {
      setTechPercent(value);
      return;
    }

    if (field === "lead") {
      setLeadPercent(value);
      const newCompany = 100 - (Number(techPercent) || 0) - num;
      setCompanyPercent(String(newCompany));
      return;
    }

    if (field === "company") {
      setCompanyPercent(value);
      const newLead = 100 - (Number(techPercent) || 0) - num;
      setLeadPercent(String(newLead));
    }
  }

  function normalizePercent(field: "tech" | "lead" | "company") {
    let val =
      field === "tech"
        ? techPercent
        : field === "lead"
        ? leadPercent
        : companyPercent;

    if (val === "" || val === null) val = "0";
    const num = Number(val);
    const formatted =
      Math.abs(num % 1) < 0.00001 ? String(num) : num.toFixed(2);

    if (disableAutoAdjust) {
      if (field === "tech") setTechPercent(formatted);
      if (field === "lead") setLeadPercent(formatted);
      if (field === "company") setCompanyPercent(formatted);
      return;
    }

    if (field === "tech") {
      setTechPercent(formatted);
      return;
    }

    if (field === "lead") {
      setLeadPercent(formatted);
      const newCompany =
        100 - (Number(techPercent) || 0) - num;
      const formattedCompany =
        Math.abs(newCompany % 1) < 0.00001
          ? String(newCompany)
          : newCompany.toFixed(2);
      setCompanyPercent(formattedCompany);
      return;
    }

    if (field === "company") {
      setCompanyPercent(formatted);
      const newLead =
        100 - (Number(techPercent) || 0) - num;
      const formattedLead =
        Math.abs(newLead % 1) < 0.00001
          ? String(newLead)
          : newLead.toFixed(2);
      setLeadPercent(formattedLead);
    }
  }

  // ------------ MAIN CALC ------------
  function calculate() {
    if (!payments.length) return;

    // 1) Totals and who holds money
    let totalAmount = 0;
    let totalCcFee = 0;

    let amountHeldByTech = 0;
    let amountHeldByCompany = 0;
    let amountHeldByLead = 0;

    // CC fee split by collector (for reimbursement)
    let ccFeeToTech = 0;
    let ccFeeToLead = 0;
    let ccFeeToCompany = 0;

    payments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      totalAmount += amt;

      // Who holds money
      if (p.payment === "cash") {
        amountHeldByTech += amt;
      } else {
        if (p.collectedBy === "tech") amountHeldByTech += amt;
        if (p.collectedBy === "company") amountHeldByCompany += amt;
        if (p.collectedBy === "lead") amountHeldByLead += amt;
      }

      // CC fee ONLY for credit (you wanted to expand later to check/zelle)
      if (p.payment === "credit") {
        const pct = Number(p.ccFeePct) || 0;
        const fee = (amt * pct) / 100;
        totalCcFee += fee;

        if (p.collectedBy === "tech") ccFeeToTech += fee;
        else if (p.collectedBy === "lead") ccFeeToLead += fee;
        else ccFeeToCompany += fee;
      }
    });

    // 2) Parts
    const techPartsVal = Number(techParts) || 0;
    const leadPartsVal = Number(leadParts) || 0;
    const companyPartsVal = Number(companyParts) || 0;
    const totalParts =
      techPartsVal + leadPartsVal + companyPartsVal;

    // 3) Percentages
    const tPct = (Number(techPercent) || 0) / 100;
    const lPct = (Number(leadPercent) || 0) / 100;
    const cPct = (Number(companyPercent) || 0) / 100;

    // 4) Adjusted total (no parts, no ccFee)
    const adjustedTotal = totalAmount - totalParts - totalCcFee;

    // 5) Base profits (no parts yet, but with ccFee reimbursement)
    let techProfitBase =
      adjustedTotal * tPct + ccFeeToTech;
    let leadProfitBase =
      adjustedTotal * lPct + ccFeeToLead;
    let companyProfitBase =
      adjustedTotal * cPct + ccFeeToCompany;

    // 6) Additional lead fee
    const addFee = Number(leadAdditionalFee) || 0;
    if (addFee !== 0) {
      leadProfitBase += addFee;
      if (techPaysAdditionalFee) {
        techProfitBase -= addFee;
      } else {
        companyProfitBase -= addFee;
      }
    }

    // 7) Profit display (visual only, parts optional)
    let techProfitDisplay = techProfitBase;
    let leadProfitDisplay = leadProfitBase;
    let companyProfitDisplayReal = companyProfitBase;

    if (includePartsInProfit) {
      techProfitDisplay += techPartsVal;
      leadProfitDisplay += leadPartsVal;
      companyProfitDisplayReal += companyPartsVal;
    }

    const companyProfitDisplay = leadOwnedByCompany
      ? companyProfitDisplayReal + leadProfitBase
      : companyProfitDisplayReal;

    // 8) BALANCES (REAL MONEY)

    let techBalance = 0;
    let leadBalance = 0;
    let companyBalance = 0;

    if (!excludeTechFromParts) {
      // Normal mode: each pays own parts
      const techPartsCharge = techPartsVal;
      const leadPartsCharge = leadPartsVal;
      const companyPartsCharge = companyPartsVal;

      techBalance =
        amountHeldByTech - techProfitBase - techPartsCharge;

      leadBalance =
        amountHeldByLead - leadProfitBase - leadPartsCharge;

      companyBalance =
        amountHeldByCompany -
        companyProfitBase -
        companyPartsCharge;
    } else {
      // EXCLUDE TECH FROM PAYING LEAD/COMPANY PARTS
      // Tech is treated as if job has no parts (for his %),
      // but still pays his OWN parts (techPartsVal).

      // Tech profit for BALANCE (use totalAmount share, not adjustedTotal)
      const techProfitForBalance =
        totalAmount * tPct +
        ccFeeToTech -
        (techPaysAdditionalFee ? addFee : 0);

      techBalance =
        amountHeldByTech -
        techProfitForBalance -
        techPartsVal;

      // Lead / company: still based on adjustedTotal + their own parts
      const leadProfitForBalance =
        leadProfitBase + leadPartsVal;
      const companyProfitForBalance =
        companyProfitBase + companyPartsVal;

      leadBalance =
        amountHeldByLead - leadProfitForBalance;

      companyBalance =
        amountHeldByCompany - companyProfitForBalance;
    }

    // 9) SumCheck (profit sanity)
    const totalProfitBase =
      techProfitBase + leadProfitBase + companyProfitBase;
    const sumCheck = totalProfitBase - adjustedTotal;

    // 10) Save row
    const newRow: ResultRow = {
      id: rows.length ? rows[rows.length - 1].id + 1 : 1,
      payments: JSON.parse(JSON.stringify(payments)),
      totalAmount,
      techParts: techPartsVal,
      leadParts: leadPartsVal,
      companyParts: companyPartsVal,
      totalParts,
      totalCcFee,
      techProfit: techProfitDisplay,
      leadProfit: leadProfitDisplay,
      companyProfitDisplay,
      companyProfitBase,
      techBalance,
      leadBalance,
      companyBalance,
      sumCheck,
      leadOwnedByCompany,
      techPercent: Number(techPercent),
      leadPercent: Number(leadPercent),
      companyPercent: Number(companyPercent),
      leadAdditionalFee: Number(leadAdditionalFee),
      techPaysAdditionalFee,
    };

    setRows((prev) => [...prev, newRow]);
  }

  // ------------ UI ------------
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-2">
        Test Formula Engine (Multi-Payment)
      </h1>
      <p className="text-sm text-gray-600 mb-4">
        Use this page to simulate different payments, parts, CC fees,
        additional lead fees, and commission logic.
      </p>

      {/* JOB SETTINGS */}
      <div className="border rounded-lg p-4 bg-white space-y-4">
        <h2 className="font-semibold text-lg mb-2">
          Job Settings
        </h2>

        {/* Percentages */}
        <div className="grid grid-cols-3 gap-4">
          {/* TECH % */}
          <div>
            <label className="block text-xs font-medium mb-1">
              Tech %
            </label>
            <input
              className={`border p-2 rounded w-full ${
                Number(techPercent) < 0
                  ? "text-red-600 font-bold"
                  : ""
              }`}
              value={techPercent}
              onChange={(e) =>
                handlePercentChange("tech", e.target.value)
              }
              onBlur={() => normalizePercent("tech")}
            />
          </div>

          {/* LEAD % */}
          <div>
            <label className="block text-xs font-medium mb-1">
              Lead %
            </label>
            <input
              className={`border p-2 rounded w-full ${
                Number(leadPercent) < 0
                  ? "text-red-600 font-bold"
                  : ""
              }`}
              value={leadPercent}
              onChange={(e) =>
                handlePercentChange("lead", e.target.value)
              }
              onBlur={() => normalizePercent("lead")}
            />
            <p className="text-[10px] text-gray-500 mt-1 italic">
              auto-adjusted from company input (if enabled)
            </p>
          </div>

          {/* COMPANY % */}
          <div>
            <label className="block text-xs font-medium mb-1">
              Company %
            </label>
            <input
              className={`border p-2 rounded w-full ${
                Number(companyPercent) < 0
                  ? "text-red-600 font-bold"
                  : ""
              }`}
              value={companyPercent}
              onChange={(e) =>
                handlePercentChange("company", e.target.value)
              }
              onBlur={() => normalizePercent("company")}
            />
            <p className="text-[10px] text-gray-500 mt-1 italic">
              auto-adjusted from lead input (if enabled)
            </p>
          </div>
        </div>

        {/* Parts row */}
        <div className="grid grid-cols-3 gap-4 pt-2">
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
              Lead Parts ($)
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
        <div className="flex flex-wrap gap-6 pt-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includePartsInProfit}
              onChange={(e) =>
                setIncludePartsInProfit(e.target.checked)
              }
            />
            Include parts in profit columns (visual only)
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={excludeTechFromParts}
              onChange={(e) =>
                setExcludeTechFromParts(e.target.checked)
              }
            />
            Exclude tech from paying lead/company parts
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={disableAutoAdjust}
              onChange={(e) =>
                setDisableAutoAdjust(e.target.checked)
              }
            />
            Disable Lead/Company auto-adjust
          </label>
        </div>

        {/* Additional Fee + lead owned */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium mb-1">
              Lead Additional Fee ($ per job)
            </label>
            <input
              className="border p-2 rounded w-full"
              value={leadAdditionalFee}
              onChange={(e) =>
                setLeadAdditionalFee(e.target.value)
              }
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm mt-5">
            <input
              type="checkbox"
              checked={techPaysAdditionalFee}
              onChange={(e) =>
                setTechPaysAdditionalFee(e.target.checked)
              }
            />
            Tech pays additional fee
          </label>

          <label className="inline-flex items-center gap-2 text-sm mt-5">
            <input
              type="checkbox"
              checked={leadOwnedByCompany}
              onChange={(e) =>
                setLeadOwnedByCompany(e.target.checked)
              }
            />
            Lead source owned by company
          </label>
        </div>
      </div>

      {/* PAYMENT BLOCKS */}
      <div className="border rounded-lg p-4 bg-white space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-lg">
            Payment Blocks (Multi-Payment Support)
          </h2>
          <button
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
                className="relative grid grid-cols-5 gap-3 border rounded p-3 bg-gray-50"
              >
                <button
                  type="button"
                  onClick={() => removePaymentRow(p.id)}
                  className="absolute top-1 right-1 text-red-600 text-xs font-bold"
                >
                  ✕
                </button>

                {/* Method */}
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
                      <label className="block text-xs font-medium mb-1">
                        Collected By
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
                  ) : (
                    <div className="text-xs text-gray-500 pt-6">
                      Cash → always Technician
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

                {/* CC Fee */}
                <div>
                  {p.payment === "credit" ? (
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
                  ) : (
                    <div className="text-xs text-gray-500 pt-6">
                      No CC Fee
                    </div>
                  )}
                </div>

                {/* Row info */}
                <div className="text-xs text-gray-500 flex items-center">
                  Payment #{p.id}
                </div>
              </div>
            );
          })}
        </div>

        <button
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
            No rows yet. Configure a job and press{" "}
            <b>Run Formula</b>.
          </p>
        )}

        {rows.length > 0 && (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">#</th>
                <th className="p-2 border">Collected By</th>
                <th className="p-2 border">Cash</th>
                <th className="p-2 border">Credit</th>
                <th className="p-2 border">Check</th>
                <th className="p-2 border">Zelle</th>
                <th className="p-2 border">Add.Fee</th>
                <th className="p-2 border">CC Fee $</th>
                <th className="p-2 border">Total $</th>
                <th className="p-2 border">Parts $</th>
                <th className="p-2 border">Adj Total</th>
                <th className="p-2 border">Tech %</th>
                <th className="p-2 border">Tech Profit</th>
                <th className="p-2 border">Lead %</th>
                <th className="p-2 border">Lead Profit</th>
                <th className="p-2 border">Comp %</th>
                <th className="p-2 border">Company Profit</th>
                <th className="p-2 border">Tech Bal</th>
                <th className="p-2 border">Lead Bal</th>
                <th className="p-2 border">Comp Bal</th>
                <th className="p-2 border">SumCheck</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const cashTotal = r.payments
                  .filter((x) => x.payment === "cash")
                  .reduce(
                    (s, x) => s + Number(x.amount || 0),
                    0
                  );

                const creditTotal = r.payments
                  .filter((x) => x.payment === "credit")
                  .reduce(
                    (s, x) => s + Number(x.amount || 0),
                    0
                  );

                const checkTotal = r.payments
                  .filter((x) => x.payment === "check")
                  .reduce(
                    (s, x) => s + Number(x.amount || 0),
                    0
                  );

                const zelleTotal = r.payments
                  .filter((x) => x.payment === "zelle")
                  .reduce(
                    (s, x) => s + Number(x.amount || 0),
                    0
                  );

                const sumCheckDisplay = r.leadOwnedByCompany
                  ? `${r.sumCheck.toFixed(2)}*`
                  : r.sumCheck.toFixed(2);

                return (
                  <tr
                    key={r.id}
                    className="odd:bg-white even:bg-gray-50"
                  >
                    <td className="border p-2 text-center">
                      <input type="checkbox" className="mr-1" />
                      {r.id}
                    </td>

                    <td className="border p-2">
                      {r.payments
                        .map((x) => x.collectedBy)
                        .join(", ")}
                    </td>

                    <td className="border p-2">
                      ${cashTotal.toFixed(2)}
                    </td>
                    <td className="border p-2">
                      ${creditTotal.toFixed(2)}
                    </td>
                    <td className="border p-2">
                      ${checkTotal.toFixed(2)}
                    </td>
                    <td className="border p-2">
                      ${zelleTotal.toFixed(2)}
                    </td>

                    <td className="border p-2">
                      ${(r.leadAdditionalFee || 0).toFixed(2)}
                    </td>

                    <td className="border p-2">
                      ${r.totalCcFee.toFixed(2)}
                    </td>

                    <td className="border p-2">
                      ${r.totalAmount.toFixed(2)}
                    </td>

                    <td className="border p-2">
  ${ (r.techParts + r.leadParts + r.companyParts).toString().replace(/\.00$/, "") }
</td>

                    <td className="border p-2">
  ${ (r.totalAmount - r.totalParts - r.totalCcFee).toFixed(2).replace(/\.00$/, "") }
</td>

                    {/* Tech */}
                    <td className="border p-2">
                      {r.techPercent}%
                    </td>
                    <td className="border p-2">
                      ${r.techProfit.toFixed(2)}
                    </td>

                    {/* Lead */}
                    <td className="border p-2">
                      {r.leadPercent}%
                    </td>
                    <td className="border p-2">
                      ${r.leadProfit.toFixed(2)}
                    </td>

                    {/* Company */}
                    <td className="border p-2">
                      {r.companyPercent}%
                    </td>
                    <td className="border p-2">
                      ${r.companyProfitDisplay.toFixed(2)}
                      {r.leadOwnedByCompany && " *"}
                    </td>

                    {/* Balances */}
                    <td
                      className={`border p-2 font-bold ${
                        r.techBalance < 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      ${r.techBalance.toFixed(2)}
                    </td>

                    <td
                      className={`border p-2 font-bold ${
                        r.leadBalance < 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      ${r.leadBalance.toFixed(2)}
                    </td>

                    <td
                      className={`border p-2 font-bold ${
                        r.companyBalance < 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      ${r.companyBalance.toFixed(2)}
                    </td>

                    <td
                      className={`border p-2 font-bold ${
                        Math.abs(r.sumCheck) < 0.01
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      ${sumCheckDisplay}
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
              <span className="font-bold">Balance rule:</span>{" "}
              Green = entity owes company, Red = company must pay
              entity.
            </p>
            <p>SumCheck should be near zero (rounding OK).</p>
            <p>
              * When <b>Lead Owned by Company</b> is enabled,
              company profit combines company + lead, but
              SumCheck still uses internal base profit.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}