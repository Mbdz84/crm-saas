"use client";

import { useState } from "react";

export default function ClosingUIExample() {
  const [payments, setPayments] = useState([
    { id: 1, method: "cash", collectedBy: "tech", amount: "" },
  ]);

  function addPaymentRow() {
    setPayments((prev) => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        method: "cash",
        collectedBy: "tech",
        amount: "",
      },
    ]);
  }

  function updatePayment(id: number, key: string, value: string) {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [key]: value } : p))
    );
  }

  function removePayment(id: number) {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-2">Closing Panel UI (Layout Only)</h1>
      <p className="text-sm text-gray-500">
        This UI is only for design. Final logic will be connected later.
      </p>

      {/* 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT SIDE — PAYMENT BLOCKS */}
        <div className="border rounded-lg p-4 bg-gray-50 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-lg">Payment Blocks</h2>
            <button
              onClick={addPaymentRow}
              className="px-3 py-1 text-sm bg-gray-900 text-white rounded"
            >
              + Add Payment
            </button>
          </div>

          <div className="space-y-3">
            {payments.map((p) => (
              <div
                key={p.id}
                className="relative grid grid-cols-3 gap-3 border rounded p-3 bg-gray-100 shadow-sm"
              >
                {/* Remove */}
                <button
                  className="absolute top-1 right-1 text-red-600 text-xs font-bold"
                  onClick={() => removePayment(p.id)}
                >
                  ✕
                </button>

                {/* Method */}
                <div>
                  <label className="block text-xs font-medium mb-1">Method</label>
                  <select
                    value={p.method}
                    onChange={(e) => updatePayment(p.id, "method", e.target.value)}
                    className="border rounded p-2 bg-white w-full"
                  >
                    <option value="cash">Cash</option>
                    <option value="credit">Credit</option>
                    <option value="check">Check</option>
                    <option value="zelle">Zelle</option>
                  </select>
                </div>

                {/* Collected By */}
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Collected By
                  </label>
                  <select
                    value={p.collectedBy}
                    onChange={(e) =>
                      updatePayment(p.id, "collectedBy", e.target.value)
                    }
                    className="border rounded p-2 bg-white w-full"
                  >
                    <option value="tech">Technician</option>
                    <option value="company">Company</option>
                    <option value="lead">Lead Source</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-medium mb-1">Amount ($)</label>
                  <input
                    value={p.amount}
                    onChange={(e) => updatePayment(p.id, "amount", e.target.value)}
                    maxLength={18}
                    className="border rounded p-2 bg-slate-100 w-full font-mono"
                    placeholder="$1234567"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE — SETTINGS */}
        <div className="border rounded-lg p-4 bg-slate-100 space-y-6 shadow-sm">
          <h2 className="font-semibold text-lg">Commission & Settings</h2>

          {/* Percentages */}
          <div>
            <h3 className="font-medium mb-2">Percentages</h3>
            <div className="grid grid-cols-3 gap-4">
              <SettingInput label="Tech %" placeholder="30" />
              <SettingInput label="Lead %" placeholder="50" />
              <SettingInput label="Company %" placeholder="20" />
            </div>

            {/* Disable auto-adjust */}
            <div className="mt-3">
              <Toggle label="Disable Lead/Company auto-adjust" />
            </div>
          </div>

          {/* Parts */}
          <div>
            <h3 className="font-medium mb-2">Parts</h3>
            <div className="grid grid-cols-3 gap-4">
              <SettingInput label="Tech Parts" placeholder="$0" />
              <SettingInput label="Lead Parts" placeholder="$0" />
              <SettingInput label="Company Parts" placeholder="$0" />
            </div>
          </div>

          {/* Additional Fee */}
          <div>
            <h3 className="font-medium mb-2">Additional Fee</h3>
            <div className="grid grid-cols-3 gap-4">
              <SettingInput label="Additional Fee $" placeholder="$0" />
            </div>

            <div className="mt-2">
              <Toggle label="Tech pays additional fee" />
            </div>
          </div>

          {/* Remove these: include-parts, owned-by-company */}
          {/* They are now in profile setting pages */}

          <div className="pt-4">
            <button className="w-full bg-blue-600 text-white py-2 rounded shadow">
              Close Job (UI Only)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* SMALL REUSABLE INPUT COMPONENT */
function SettingInput({
  label,
  placeholder,
}: {
  label: string;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      <input
        maxLength={8}
        className="border rounded p-2 w-full font-mono"
        placeholder={placeholder}
      />
    </div>
  );
}

/* TOGGLE COMPONENT */
function Toggle({ label }: { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="w-4 h-4" />
      {label}
    </label>
  );
}