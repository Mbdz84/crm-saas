"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Per-entity settle control for the report summary rows.
 * Settlement is per (job x party): this settles all of one party's jobs
 * (technician or lead source) for the report's week.
 */
export default function SettleCell({
  partyType,
  partyId,
  partyName,
  from,
  to,
  jobs,
}: {
  partyType: "technician" | "leadSource";
  partyId?: string;
  partyName: string;
  from?: string;
  to?: string;
  jobs: { jobId: string; amount: number }[];
}) {
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [status, setStatus] = useState<Record<string, any>>({});
  const [settling, setSettling] = useState(false);

  const jobIds = jobs.map((j) => j.jobId);
  const idKey = jobIds.join(",");

  async function loadStatus() {
    if (!partyId || jobIds.length === 0) {
      setStatus({});
      return;
    }
    try {
      const res = await fetch(
        `${API}/settlements/status?partyType=${partyType}&partyId=${partyId}&jobIds=${idKey}`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const d = await res.json();
      setStatus(d.settled || {});
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId, idKey]);

  const settledCount = jobIds.filter((id) => status[id]).length;
  const allSettled = jobIds.length > 0 && settledCount === jobIds.length;

  // Warn if a settled job in this report belongs to a DIFFERENT week
  // (e.g. an old already-settled job was moved into this week).
  const outOfPeriod = jobIds.some((id) => {
    const s = status[id];
    if (!s || !from || !to) return false;
    const ps = new Date(s.periodStart).toISOString().slice(0, 10);
    const pe = new Date(s.periodEnd).toISOString().slice(0, 10);
    return ps !== from || pe !== to;
  });

  async function settle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!partyId) return;
    const toSettle = jobs.filter((j) => !status[j.jobId]);
    if (toSettle.length === 0) return;
    setSettling(true);
    try {
      const res = await fetch(`${API}/settlements/settle`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyType,
          partyId,
          partyName,
          periodStart: from,
          periodEnd: to,
          jobs: toSettle,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to settle");
      toast.success(`Settled ${d.settledCount} job(s) with ${partyName}`);
      await loadStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to settle");
    } finally {
      setSettling(false);
    }
  }

  return (
    <div
      className="flex items-center justify-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      {outOfPeriod && (
        <span
          title="This report contains a job already settled in a different week — review it"
          className="text-amber-600"
        >
          ⚠️
        </span>
      )}
      <span className="text-[11px] text-gray-500 whitespace-nowrap">
        {settledCount}/{jobIds.length}
      </span>
      <button
        onClick={settle}
        disabled={settling || allSettled || !partyId || jobIds.length === 0}
        className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
          allSettled
            ? "bg-green-100 text-green-700 cursor-default"
            : "bg-blue-600 text-white hover:bg-blue-500"
        } disabled:opacity-50`}
      >
        {allSettled ? "Settled ✓" : settling ? "…" : "Settle"}
      </button>
    </div>
  );
}
