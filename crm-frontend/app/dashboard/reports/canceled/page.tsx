"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import CanceledTable from "./CanceledTable";
import { exportCanceledHTML } from "./exportCanceledHTML";

export default function CanceledReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // NEW filters
  const [selectedTech, setSelectedTech] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [groupByTech, setGroupByTech] = useState(false);
  const [groupBySource, setGroupBySource] = useState(false);
// TIMEZONE
const [timezone, setTimezone] = useState("America/Chicago");

const TIMEZONES = [
  { value: "America/New_York", label: "US – Eastern (New York)" },
  { value: "America/Chicago", label: "US – Central (Chicago)" },
  { value: "America/Denver", label: "US – Mountain (Denver)" },
  { value: "America/Los_Angeles", label: "US – Pacific (Los Angeles)" },
  { value: "Asia/Jerusalem", label: "Israel (Jerusalem)" },
];


  // COLUMN VISIBILITY STATE
const [columnsVisible, setColumnsVisible] = useState<Record<string, boolean>>({
  date: true,
  jobId: true,
  customer: true,
  phones: true,
  address: true,
  technician: true,
  leadSource: true,
  canceledReason: true,
  description: true,
});

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  async function loadReport(f = from, t = to) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f) params.append("from", f);
if (t) params.append("to", t);
params.append("tz", timezone);

      const res = await fetch(`${API}/reports/canceled?` + params, {
        credentials: "include",
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to load canceled report");
        setLoading(false);
        return;
      }

      setData(json);
      toast.success("Canceled report loaded");
    } catch {
      toast.error("Network error");
    }
    setLoading(false);
  }

  /* ============================================================
     BUILD DROPDOWN OPTIONS (after data loads)
  ============================================================ */
  const technicianList = useMemo(() => {
    if (!data?.jobs) return [];
    const names = new Set<string>();
    data.jobs.forEach((job: any) =>
      names.add(job.technician?.name || "Unassigned")
    );
    return Array.from(names);
  }, [data]);

  const sourceList = useMemo(() => {
    if (!data?.jobs) return [];
    const names = new Set<string>();
    data.jobs.forEach((job: any) =>
      names.add(job.source?.name || "Unknown Source")
    );
    return Array.from(names);
  }, [data]);

  /* ============================================================
     APPLY FILTERS
  ============================================================ */
  function filterRows() {
    if (!data?.jobs) return [];

    let rows = [...data.jobs];

    if (selectedTech !== "all") {
      rows = rows.filter(
        (j) => (j.technician?.name || "Unassigned") === selectedTech
      );
    }

    if (selectedSource !== "all") {
      rows = rows.filter(
        (j) => (j.source?.name || "Unknown Source") === selectedSource
      );
    }

    return rows;
  }

  const filteredRows = filterRows();

  /* ============================================================
     GROUPED TABLE OUTPUT
  ============================================================ */
  function renderGrouped() {
    if (groupByTech) {
      const groups: Record<string, any[]> = {};

      filteredRows.forEach((job) => {
        const tech = job.technician?.name || "Unassigned";
        if (!groups[tech]) groups[tech] = [];
        groups[tech].push(job);
      });

      return (
        <div className="space-y-10">
          {Object.entries(groups).map(([tech, rows]) => (
            <div key={tech}>
              <h2 className="text-lg font-bold mb-2 text-blue-600">
                Technician: {tech}
              </h2>
              <CanceledTable rows={rows} visible={columnsVisible} />
            </div>
          ))}
        </div>
      );
    }

    if (groupBySource) {
      const groups: Record<string, any[]> = {};

      filteredRows.forEach((job) => {
        const src = job.source?.name || "Unknown Source";
        if (!groups[src]) groups[src] = [];
        groups[src].push(job);
      });

      return (
        <div className="space-y-10">
          {Object.entries(groups).map(([src, rows]) => (
            <div key={src}>
              <h2 className="text-lg font-bold mb-2 text-purple-600">
                Lead Source: {src}
              </h2>
              <CanceledTable rows={rows} visible={columnsVisible} />
            </div>
          ))}
        </div>
      );
    }

    // Normal flat table (no grouping)
    return <CanceledTable rows={filteredRows} visible={columnsVisible} />;
  }

  /* ============================================================ */

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Canceled Jobs Report</h1>

      {/* Date Range */}
      <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded border">

        {/* DATE PRESETS */}
<div className="flex flex-col">
  <label className="text-sm mb-1">Date Presets</label>
  <select
    onChange={(e) => {
      const preset = e.target.value;
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
    }}
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
          {loading ? "Loading…" : "Load Canceled Report"}
        </button>
        {/* force next row */}
<div className="basis-full h-0" />

{/* TIMEZONE */}
<div className="flex flex-col">
  <label className="text-sm mb-1">Timezone</label>
  <select
    value={timezone}
    onChange={(e) => setTimezone(e.target.value)}
    className="border rounded px-2 py-1"
  >
    {TIMEZONES.map((tz) => (
      <option key={tz.value} value={tz.value}>
        {tz.label}
      </option>
    ))}
  </select>
  <span className="text-xs text-gray-500 mt-1">
    Date range is interpreted in this timezone
  </span>
</div>
      </div>

      {/* FILTERS */}
      <div className="border rounded p-4 bg-gray-50 space-y-4">

        {/* Clear Filters Button */}
  <div>
    <button
      onClick={() => {
        setFrom("");
        setTo("");
        setSelectedTech("all");
        setSelectedSource("all");
        setGroupByTech(false);
        setGroupBySource(false);
        setData(data); // keeps data loaded, only resets filters
        toast.success("Filters cleared");
      }}
      className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-sm rounded"
    >
      Clear Filters
    </button>
  </div>

   {/* COLUMN VISIBILITY BUTTONS */}
<div className="border rounded p-3 bg-gray-50 mt-4">
  <h3 className="font-semibold mb-2 text-sm">Show / Hide Columns</h3>
  <div className="flex flex-wrap gap-4">
    {Object.keys(columnsVisible).map((key) => (
      <label key={key} className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={columnsVisible[key]}
          onChange={() =>
            setColumnsVisible({
              ...columnsVisible,
              [key]: !columnsVisible[key],
            })
          }
        />
        {key}
      </label>
    ))}
  </div>
</div>

        {/* Dropdowns */}
        <div className="flex gap-6">
          {/* Technician Filter */}
          <div>
            <label className="text-sm mr-2">Technician:</label>
            <select
              className="border px-2 py-1 rounded"
              value={selectedTech}
              onChange={(e) => {
                setSelectedTech(e.target.value);
                setGroupByTech(false);
              }}
            >
              <option value="all">All</option>
              {technicianList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Lead Source Filter */}
          <div>
            <label className="text-sm mr-2">Lead Source:</label>
            <select
              className="border px-2 py-1 rounded"
              value={selectedSource}
              onChange={(e) => {
                setSelectedSource(e.target.value);
                setGroupBySource(false);
              }}
            >
              <option value="all">All</option>
              {sourceList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grouping Checkboxes */}
        <div className="flex gap-6 items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={groupByTech}
              onChange={() => {
                setGroupByTech(!groupByTech);
                setGroupBySource(false);
                setSelectedTech("all");
              }}
            />
            Group by Technician
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={groupBySource}
              onChange={() => {
                setGroupBySource(!groupBySource);
                setGroupByTech(false);
                setSelectedSource("all");
              }}
            />
            Group by Lead Source
          </label>
        </div>
      </div>

      {/* Total Count */}
      {data?.summary && (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">
            Total canceled jobs:{" "}
            <span className="font-bold">{data.summary.count}</span>
          </p>
        </div>
      )}

      {/* EXPORT BUTTON */}
{data?.jobs && data.jobs.length > 0 && (
  <div className="flex justify-start mt-3 gap-2">
    <button
      onClick={() => exportCanceledHTML(filteredRows)}
      className="px-3 py-1 bg-white border rounded text-sm hover:bg-gray-100"
    >
      Export HTML
    </button>
  </div>
)}

      {/* TABLE OR GROUPED TABLE */}
      {renderGrouped()}
    </div>
      );
}
