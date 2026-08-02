"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

/**
 * Settlement / payment history for one party (technician or lead source).
 * Used on both the technician and lead-source detail pages.
 */
export default function PaymentsTab({
  partyType,
  partyId,
}: {
  partyType: "technician" | "leadSource";
  partyId: string;
}) {
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [unpaidTotal, setUnpaidTotal] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);

  // Which row's paid-date is currently being edited
  const [editPaidId, setEditPaidId] = useState<string | null>(null);

  // Manual "add row" form
  const [addOpen, setAddOpen] = useState(false);
  const [mDate, setMDate] = useState("");
  const [mHasRange, setMHasRange] = useState(false);
  const [mTo, setMTo] = useState("");
  const [mAmount, setMAmount] = useState("");
  const [mNote, setMNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/settlements?partyType=${partyType}&partyId=${partyId}&limit=${limit}`,
        { credentials: "include" }
      );
      const d = await res.json();
      setRows(d.rows || []);
      setTotal(d.total || 0);
      setUnpaidTotal(Number(d.unpaidTotal || 0));
      setUnpaidCount(Number(d.unpaidCount || 0));
    } catch {
      toast.error("Failed to load payments");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (partyId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId, limit]);

  const money = (n: number) =>
    Number(n).toLocaleString(undefined, { style: "currency", currency: "USD" });
  const day = (d?: string) => (d ? new Date(d).toLocaleDateString() : "—");
  const ymd = (d?: string) => (d ? String(d).slice(0, 10) : "");
  // Local YYYY-MM-DD — avoids the UTC shift that made "today" land on the next day.
  const todayLocal = () =>
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  // Week/paid dates are stored at UTC midnight — render the literal calendar day
  // instead of letting the browser shift it backward a day.
  const dateOnly = (d?: string) =>
    d ? new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString() : "—";

  async function patch(id: string, body: any) {
    try {
      const res = await fetch(`${API}/settlements/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      load();
    } catch {
      toast.error("Failed to update");
    }
  }

  async function addManual() {
    if (!mDate) return toast.error("Pick a date");
    setSaving(true);
    try {
      const res = await fetch(`${API}/settlements/manual`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyType,
          partyId,
          periodStart: mDate,
          periodEnd: mHasRange && mTo ? mTo : mDate,
          amount: Number(mAmount || 0),
          note: mNote,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Row added");
      setAddOpen(false);
      setMDate("");
      setMHasRange(false);
      setMTo("");
      setMAmount("");
      setMNote("");
      load();
    } catch {
      toast.error("Failed to add row");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Payments</h2>
          {unpaidCount > 0 && (
            <span className="text-sm rounded-full px-3 py-1 bg-amber-100 text-amber-800 font-medium">
              Unpaid: {money(unpaidTotal)} ({unpaidCount} wk
              {unpaidCount === 1 ? "" : "s"})
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setAddOpen((o) => {
              // Opening the form → default the date to today (local).
              if (!o && !mDate) setMDate(todayLocal());
              return !o;
            });
          }}
          className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {addOpen ? "Cancel" : "+ Add row"}
        </button>
      </div>

      {addOpen && (
        <div className="border rounded p-3 bg-gray-50 dark:bg-gray-900 flex flex-wrap gap-3 items-end">
          <label className="text-xs">
            Date
            <input
              type="date"
              className="border rounded p-1.5 w-full text-sm"
              value={mDate}
              onChange={(e) => setMDate(e.target.value)}
            />
          </label>

          {mHasRange && (
            <label className="text-xs">
              To date
              <input
                type="date"
                className="border rounded p-1.5 w-full text-sm"
                value={mTo}
                onChange={(e) => setMTo(e.target.value)}
              />
            </label>
          )}

          <button
            type="button"
            onClick={() => setMHasRange((h) => !h)}
            className="px-2 py-2 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {mHasRange ? "− remove end" : "+ to date"}
          </button>

          <label className="text-xs">
            Amount
            <input
              className="border rounded p-1.5 w-28 text-sm"
              placeholder="0.00"
              value={mAmount}
              onChange={(e) => setMAmount(e.target.value)}
            />
          </label>
          <label className="text-xs flex-1 min-w-[10rem]">
            Note
            <input
              className="border rounded p-1.5 w-full text-sm"
              placeholder="e.g. 10% bonus"
              value={mNote}
              onChange={(e) => setMNote(e.target.value)}
            />
          </label>
          <button
            onClick={addManual}
            disabled={saving}
            className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="border rounded p-4 text-center text-gray-500 text-sm">
          No settlements yet.
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 text-left">
              <tr>
                <th className="px-3 py-2">Settled</th>
                <th className="px-3 py-2">Week</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Note</th>
                <th className="px-3 py-2">Paid</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const amt = Number(r.amount || 0);
                const single =
                  ymd(r.periodStart) === ymd(r.periodEnd);
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {day(r.createdAt)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {single
                        ? dateOnly(r.periodStart)
                        : `${dateOnly(r.periodStart)} – ${dateOnly(r.periodEnd)}`}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${
                        amt >= 0 ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {money(amt)}
                    </td>
                    <td className="px-3 py-2">
                      {r.manual && (
                        <span className="text-[10px] uppercase tracking-wide text-violet-700 bg-violet-100 rounded px-1 py-0.5 mr-1">
                          manual
                        </span>
                      )}
                      {r.note || ""}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!r.paid}
                          onChange={() =>
                            patch(r.id, {
                              paid: !r.paid,
                              ...(!r.paid ? { paidAt: todayLocal() } : {}),
                            })
                          }
                        />
                        {r.paid ? (
                          editPaidId === r.id ? (
                            <input
                              type="date"
                              autoFocus
                              className="border rounded p-1 text-xs"
                              value={ymd(r.paidAt)}
                              onChange={(e) => {
                                patch(r.id, { paidAt: e.target.value });
                                setEditPaidId(null);
                              }}
                              onBlur={() => setEditPaidId(null)}
                            />
                          ) : (
                            <span className="inline-flex items-center gap-1 text-green-700">
                              {dateOnly(r.paidAt)}
                              <button
                                type="button"
                                title="Change date"
                                onClick={() => setEditPaidId(r.id)}
                                className="text-gray-400 hover:text-blue-600"
                              >
                                <Pencil size={12} />
                              </button>
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">not paid</span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length < total && (
        <button
          onClick={() => setLimit((l) => l + 20)}
          className="text-sm text-blue-600 hover:underline"
        >
          See more ({total - rows.length} more)
        </button>
      )}
    </div>
  );
}
