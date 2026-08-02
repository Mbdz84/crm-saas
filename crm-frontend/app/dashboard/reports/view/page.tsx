"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import ReportsTable from "../ReportsTable";
import { calculateTotals } from "../ReportsTable/utils/totalsCalculator";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function isCancelledJob(j: any) {
  return (
    j.jobStatus?.name === "Cancelled" ||
    j.jobStatus?.name === "Canceled" ||
    !!j.canceledAt ||
    !!j.canceledReason
  );
}

/* ------------------------------------------------------------
   STANDALONE REPORT WINDOW
   Opened in a new tab from the Technician / Lead Source
   summaries. Re-fetches the report (closed + canceled) using
   the same params as the reports page, then filters the jobs
   down to a single technician or lead source.
------------------------------------------------------------ */
export default function ReportViewPage() {
  return (
    <Suspense
      fallback={<p className="p-6 text-gray-500 text-sm">Loading…</p>}
    >
      <ReportView />
    </Suspense>
  );
}

function ReportView() {
  const params = useSearchParams();

  const kind = params.get("kind") || "tech"; // "tech" | "lead"
  const name = params.get("name") || "";
  const from = params.get("from") || "";
  const to = params.get("to") || "";

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [showCancelled, setShowCancelled] = useState(false);
  // jobId -> settlement info for THIS party (settled with tech, or with lead source).
  const [settledMap, setSettledMap] = useState<Record<string, any>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const baseParams = new URLSearchParams();
        if (from) baseParams.append("from", from);
        if (to) baseParams.append("to", to);

        // 1️⃣ CLOSED JOBS
        const closedParams = new URLSearchParams(baseParams);
        closedParams.append("status", "closed");

        const closedRes = await fetch(
          `${API}/reports?` + closedParams.toString(),
          { credentials: "include" }
        );
        const closedJson = await closedRes.json();

        if (!closedRes.ok) {
          toast.error(closedJson.error || "Failed to load report");
          setLoading(false);
          return;
        }

        let mergedJobs = closedJson.jobs || [];

        // 2️⃣ CANCELED JOBS
        const canceledRes = await fetch(
          `${API}/reports/canceled?` + baseParams.toString(),
          { credentials: "include" }
        );
        const canceledJson = await canceledRes.json();

        if (canceledRes.ok && Array.isArray(canceledJson.jobs)) {
          const map = new Map<string, any>();
          mergedJobs.forEach((j: any) => map.set(j.id, j));
          canceledJson.jobs.forEach((j: any) => map.set(j.id, j));
          mergedJobs = Array.from(map.values());
        }

        setJobs(mergedJobs);
      } catch (err) {
        console.error(err);
        toast.error("Network error");
      }
      setLoading(false);
    }

    load();
  }, [API, from, to]);

  const isTech = kind !== "lead";

  const matchesEntity = (j: any) =>
    isTech
      ? name === "Unassigned"
        ? !j.technician || !j.technician.name
        : j.technician?.name === name
      : name === "Unknown Source"
      ? !j.source || !j.source.name
      : j.source?.name === name;

  // All jobs (closed + cancelled) for this tech/lead — independent of the toggle.
  const scopeJobs = useMemo(
    () => jobs.filter(matchesEntity),
    [jobs, isTech, name]
  );

  const filteredRows = useMemo(() => {
    return scopeJobs.filter((j) => {
      const isClosed = j.jobStatus?.name === "Closed";
      const isCancelled = !!j.canceledAt || !!j.canceledReason;
      return showCancelled ? isClosed || isCancelled : isClosed;
    });
  }, [scopeJobs, showCancelled]);

  /* --------------------------------------------------
     SETTLED STATUS (per party)
     Which of these jobs are already settled with THIS
     technician / lead source. Powers the "Settled" column.
  -------------------------------------------------- */
  const partyType = isTech ? "technician" : "leadSource";
  const partyId = useMemo(() => {
    const j = scopeJobs.find((x) =>
      isTech ? x.technician?.id : x.source?.id
    );
    return isTech ? j?.technician?.id : j?.source?.id;
  }, [scopeJobs, isTech]);

  const jobIdsKey = useMemo(
    () => filteredRows.map((j) => j.id).join(","),
    [filteredRows]
  );

  useEffect(() => {
    async function loadSettled() {
      if (!partyId || !jobIdsKey) {
        setSettledMap({});
        return;
      }
      try {
        const res = await fetch(
          `${API}/settlements/status?partyType=${partyType}&partyId=${partyId}&jobIds=${jobIdsKey}`,
          { credentials: "include" }
        );
        const d = await res.json();
        setSettledMap(d.settled || {});
      } catch {
        /* ignore — column just shows "—" */
      }
    }
    loadSettled();
  }, [API, partyType, partyId, jobIdsKey]);

  const defaultVisibleKeys = isTech
    ? [
        "invoice",
        "jobId",
        "leadSource",
        "date",
        "address",
        "type",
        "total",
        "tech",
        "techParts",
        "cc",
        "addFee",
        "tech%",
        "techProfit",
        "techBal",
        "leadBal",
        ...(showCancelled ? ["cancelReason"] : []),
      ]
    : [
        "invoice",
        "jobId",
        "date",
        "address",
        "type",
        "technician",
        "total",
        "leadProfit",
        "leadBal",
        ...(showCancelled ? ["cancelReason"] : []),
      ];

  /* --------------------------------------------------
     TILE STATS
     Counts come from the full scope (closed + cancelled)
     so they are independent of the "Show cancelled" toggle.
     Money comes from the closed jobs.
  -------------------------------------------------- */
  const cancelledCount = scopeJobs.filter(isCancelledJob).length;
  const closedJobs = scopeJobs.filter((j) => j.jobStatus?.name === "Closed");
  const closedCount = closedJobs.length;
  const totalJobs = scopeJobs.length;

  const closingRate = totalJobs > 0 ? (closedCount / totalJobs) * 100 : 0;
  const cancelRate = totalJobs > 0 ? (cancelledCount / totalJobs) * 100 : 0;

  const totals = useMemo(() => calculateTotals(closedJobs), [closedJobs]);
  const avgTicket = closedCount > 0 ? totals.totalAmount / closedCount : 0;

  const profit = isTech ? totals.techProfit : totals.leadProfit;
  const balance = isTech ? totals.techBalance : totals.leadBalance;

  const rangeLabel =
    from || to ? `${from || "…"} → ${to || "…"}` : "All time";

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">
          {isTech ? "Technician" : "Lead Source"} Report — {name}
        </h1>
        <p className="text-3xl font-bold text-center mt-1">{rangeLabel}</p>
      </div>

      {/* TOP TILES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white shadow rounded border">
          <p className="text-sm text-gray-500">Total Jobs</p>
          <p className="text-2xl font-bold">{totalJobs}</p>
        </div>
        <div className="p-4 bg-white shadow rounded border">
          <p className="text-sm text-gray-500">Closed</p>
          <p className="text-2xl font-bold">
            {closedCount}{" "}
            <span className="text-base font-semibold text-gray-500">
              ({closingRate.toFixed(1)}%)
            </span>
          </p>
        </div>
        <div className="p-4 bg-white shadow rounded border">
          <p className="text-sm text-gray-500">Cancelled</p>
          <p className="text-2xl font-bold">
            {cancelledCount}{" "}
            <span className="text-base font-semibold text-gray-500">
              ({cancelRate.toFixed(1)}%)
            </span>
          </p>
        </div>
        <div className="p-4 bg-white shadow rounded border">
          <p className="text-sm text-gray-500">Average Ticket</p>
          <p className="text-2xl font-bold">{usd.format(avgTicket)}</p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          className="h-5 w-5 cursor-pointer"
          checked={showCancelled}
          onChange={(e) => setShowCancelled(e.target.checked)}
        />
        Show cancelled jobs
      </label>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : (
        <ReportsTable
          rows={filteredRows}
          from={from}
          to={to}
          expandedTechName={isTech ? name : null}
          expandedSourceName={isTech ? null : name}
          settledMap={settledMap}
          settledLabel={isTech ? "Settled (tech)" : "Settled (lead)"}
          defaultVisibleKeys={defaultVisibleKeys}
          storageKey={
            isTech
              ? "report_column_defaults_tech"
              : "report_column_defaults_lead"
          }
        />
      )}

      {/* BOTTOM TILES — same figures as the HTML export */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white shadow rounded border text-center">
            <p className="text-sm text-gray-500">Total Collected</p>
            <p className="text-2xl font-bold">
              {usd.format(totals.totalAmount)}
            </p>
          </div>
          <div className="p-4 bg-white shadow rounded border text-center">
            <p className="text-sm text-gray-500">Profit</p>
            <p className="text-2xl font-bold">{usd.format(profit)}</p>
          </div>
          <div className="p-4 bg-white shadow rounded border text-center">
            <p className="text-sm text-gray-500">Balance</p>
            <p
              className={`text-2xl font-bold ${
                balance > 0
                  ? "text-green-700"
                  : balance < 0
                  ? "text-red-600"
                  : ""
              }`}
            >
              {usd.format(balance)}
            </p>
            {balance !== 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {balance > 0
                  ? `(${isTech ? "tech" : "lead"} need to pay)`
                  : `(${isTech ? "tech" : "lead"} getting paid)`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
