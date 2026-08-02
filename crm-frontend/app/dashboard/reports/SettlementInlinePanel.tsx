"use client";

import { useEffect, useState } from "react";

/**
 * Inline "recent payments" panel shown UNDER a party name on the report
 * (opened by the $ icon). Last 5 rows + "See more" (inline) + "See all"
 * (→ that party's Payments tab).
 */
export default function SettlementInlinePanel({
  partyType,
  partyId,
  partyName,
}: {
  partyType: "technician" | "leadSource";
  partyId?: string;
  partyName: string;
}) {
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [unpaidTotal, setUnpaidTotal] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!partyId) return;
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
      /* ignore */
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId, limit]);

  const money = (n: number) =>
    Number(n).toLocaleString(undefined, { style: "currency", currency: "USD" });
  const day = (d?: string) => (d ? new Date(d).toLocaleDateString() : "—");
  // Week/paid dates are stored at UTC midnight — render the literal calendar day.
  const dateOnly = (d?: string) =>
    d ? new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString() : "—";

  const detailHref =
    partyType === "technician"
      ? `/dashboard/technicians/${partyId}?tab=payments`
      : `/dashboard/settings/lead-sources/${partyId}?tab=payments`;

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-900 text-left">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-base flex items-center gap-2">
          {partyName} — recent payments
          {unpaidCount > 0 && (
            <span className="text-xs rounded-full px-2 py-0.5 bg-amber-100 text-amber-800 font-medium">
              Unpaid {money(unpaidTotal)} · {unpaidCount} wk
              {unpaidCount === 1 ? "" : "s"}
            </span>
          )}
        </span>
        <a
          href={detailHref}
          className="text-sm text-blue-600 hover:underline whitespace-nowrap"
        >
          See all →
        </a>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-gray-500">No settlements yet.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="text-left font-medium py-1">Settled</th>
              <th className="text-left font-medium py-1 pl-3">Week</th>
              <th className="text-right font-medium py-1 pl-3">Amount</th>
              <th className="text-left font-medium py-1 pl-3">Note</th>
              <th className="text-left font-medium py-1 pl-3">Paid</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const amt = Number(r.amount || 0);
              return (
                <tr key={r.id} className="border-t border-gray-200">
                  <td className="py-1 whitespace-nowrap text-gray-600">
                    {day(r.createdAt)}
                  </td>
                  <td className="py-1 pl-3 whitespace-nowrap">
                    {dateOnly(r.periodStart) === dateOnly(r.periodEnd)
                      ? dateOnly(r.periodStart)
                      : `${dateOnly(r.periodStart)} – ${dateOnly(r.periodEnd)}`}
                    {r.manual && (
                      <span className="ml-1 text-[9px] uppercase text-violet-600">
                        manual
                      </span>
                    )}
                  </td>
                  <td
                    className={`py-1 pl-3 text-right font-semibold whitespace-nowrap ${
                      amt >= 0 ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {money(amt)}
                  </td>
                  <td className="py-1 pl-3 text-gray-700">{r.note || "—"}</td>
                  <td className="py-1 pl-3 whitespace-nowrap">
                    {r.paid ? (
                      <span className="text-green-700">✓ {dateOnly(r.paidAt)}</span>
                    ) : (
                      <span className="text-gray-400">not paid</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {rows.length < total && (
        <button
          onClick={() => setLimit((l) => l + 5)}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          See more
        </button>
      )}
    </div>
  );
}
