"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import TechnicianSummary from "./TechnicianSummary";
import LeadSourceSummary from "./LeadSourceSummary";
import ReportsTable from "./ReportsTable";

export default function ReportsPage() {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  /* ------------------------------------------------------------
     DATE PRESET LOGIC
  ------------------------------------------------------------ */
  function setPresetRange(preset: string) {
    const today = new Date();
    const y = new Date();
    y.setDate(y.getDate() - 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    let f = "";
    let t = "";

    switch (preset) {
      case "today":
        f = t = today.toISOString().split("T")[0];
        break;
      case "yesterday":
        f = t = y.toISOString().split("T")[0];
        break;

      case "this-week": {
        const d = new Date();
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        f = monday.toISOString().split("T")[0];
        t = today.toISOString().split("T")[0];
        break;
      }

      case "last-week": {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        f = monday.toISOString().split("T")[0];
        t = sunday.toISOString().split("T")[0];
        break;
      }

      case "two-weeks-ago": {
        const d = new Date();
        d.setDate(d.getDate() - 14);
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        f = monday.toISOString().split("T")[0];
        t = sunday.toISOString().split("T")[0];
        break;
      }

      case "this-month":
        f = monthStart.toISOString().split("T")[0];
        t = today.toISOString().split("T")[0];
        break;

      case "last-month":
        f = prevMonthStart.toISOString().split("T")[0];
        t = prevMonthEnd.toISOString().split("T")[0];
        break;

      default:
        return;
    }

    setFrom(f);
    setTo(t);
    loadReport(f, t);
  }

  /* ------------------------------------------------------------
     LOAD REPORTS
  ------------------------------------------------------------ */
  async function loadReport(f = from, t = to) {
  setLoading(true);

  try {
    const baseParams = new URLSearchParams();
    if (f) baseParams.append("from", f);
    if (t) baseParams.append("to", t);

    // 1️⃣ CLOSED JOBS
    const closedParams = new URLSearchParams(baseParams);
    closedParams.append("status", "closed");

    const closedRes = await fetch(
      `${API}/reports?` + closedParams.toString(),
      { credentials: "include" }
    );

    const closedJson = await closedRes.json();

    if (!closedRes.ok) {
      toast.error(closedJson.error || "Failed to load closed jobs");
      setLoading(false);
      return;
    }

    let mergedJobs = closedJson.jobs || [];

    // 2️⃣ CANCELED JOBS (ALWAYS FETCH)
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

    setData({
      ...closedJson, // keep summary logic intact
      jobs: mergedJobs,
    });

    toast.success("Report loaded");
  } catch (err) {
    console.error(err);
    toast.error("Network error");
  }

  setLoading(false);
}

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-2xl font-bold">Reports</h1>

      {/* DATE FILTERS */}
      <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded border">

        <div className="flex flex-col">
          <label className="text-sm mb-1">Date Presets</label>
          <select
            onChange={(e) => setPresetRange(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">Select…</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this-week">This Week</option>
            <option value="last-week">Last Week</option>
            <option value="two-weeks-ago">Two Weeks Ago</option>
            <option value="this-month">This Month to Date</option>
            <option value="last-month">Last Month</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>

        <button
          onClick={() => loadReport()}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          {loading ? "Loading…" : "Load Report"}
        </button>
        <div className="mt-4">
  <button
    onClick={() => router.push("/dashboard/reports/canceled")}
    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-700 "
  >
    Go to Canceled Jobs Report
  </button>
</div>
      </div>



{/* ------------------------------------------------------------
    SUMMARY BOXES (TOTALS)
------------------------------------------------------------ */}
{data?.summary && (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
    <div className="p-4 bg-white shadow rounded border">
      <p className="text-sm text-gray-500">Total Revenue</p>
      <p className="text-2xl font-bold">
        ${data.summary.totalRevenue.toFixed(2)}
      </p>
    </div>

    <div className="p-4 bg-white shadow rounded border">
      <p className="text-sm text-gray-500">Tech Profit</p>
      <p className="text-2xl font-bold">
        ${data.summary.totalTechProfit.toFixed(2)}
      </p>
    </div>

    <div className="p-4 bg-white shadow rounded border">
      <p className="text-sm text-gray-500">Lead Profit</p>
      <p className="text-2xl font-bold">
        ${data.summary.totalLeadProfit.toFixed(2)}
      </p>
    </div>

    <div className="p-4 bg-white shadow rounded border">
      <p className="text-sm text-gray-500">Company Profit</p>
      <p className="text-2xl font-bold">
        ${data.summary.totalCompanyProfit.toFixed(2)}
      </p>
    </div>
  </div>
)}



      {/* TECHNICIAN SUMMARY */}
      <TechnicianSummary
        data={data?.technicianSummary ?? []}
        jobs={data?.jobs ?? []}
        from={from}
        to={to}
      />

      {/* LEAD SOURCE SUMMARY */}
      <LeadSourceSummary
        data={data?.leadSourceSummary ?? []}
        jobs={data?.jobs ?? []}
        from={from}
        to={to}
      />

    </div>
  );
}