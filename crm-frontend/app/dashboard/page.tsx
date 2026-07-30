"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPhone } from "@/utils/formatPhone";

const base = process.env.NEXT_PUBLIC_API_URL;

interface UnassignedJob {
  shortId: string;
  customerName: string | null;
  customerPhone: string | null;
  status: string | null;
  createdAt: string;
}
interface Appointment {
  shortId: string;
  customerName: string | null;
  scheduledAt: string;
  technician: string | null;
  status: string | null;
}
interface Summary {
  openJobs: number;
  created: number;
  closed: number;
  canceled: number;
  revenue: number;
  unreadSms: number;
  unassigned: UnassignedJob[];
  appointments: Appointment[];
}

const RANGE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This Week" },
  { key: "last_week", label: "Last Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "this_year", label: "This Year" },
  { key: "all_time", label: "All Time" },
  { key: "custom", label: "Custom…" },
];

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

function computeRange(key: string, cf: string, ct: string) {
  const now = new Date();
  const sod = startOfDay(now);
  switch (key) {
    case "today":
      return { from: sod, to: addDays(sod, 1) };
    case "yesterday":
      return { from: addDays(sod, -1), to: sod };
    case "this_week": {
      const s = addDays(sod, -now.getDay());
      return { from: s, to: addDays(s, 7) };
    }
    case "last_week": {
      const s = addDays(sod, -now.getDay() - 7);
      return { from: s, to: addDays(s, 7) };
    }
    case "this_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      };
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 1),
      };
    case "this_year":
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: new Date(now.getFullYear() + 1, 0, 1),
      };
    case "all_time":
      return {
        from: new Date(2000, 0, 1),
        to: new Date(now.getFullYear() + 10, 0, 1),
      };
    case "custom":
      return {
        from: cf ? new Date(`${cf}T00:00:00`) : sod,
        to: ct ? addDays(new Date(`${ct}T00:00:00`), 1) : addDays(sod, 1),
      };
    default:
      return { from: sod, to: addDays(sod, 1) };
  }
}

function money(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
function timeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    if (!base) return;
    if (range === "custom" && (!customFrom || !customTo)) return; // wait for both
    const { from, to } = computeRange(range, customFrom, customTo);
    setLoading(true);
    fetch(
      `${base}/dashboard/summary?from=${from.toISOString()}&to=${to.toISOString()}`,
      { credentials: "include", cache: "no-store" }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range, customFrom, customTo]);

  const rangeLabel =
    RANGE_OPTIONS.find((o) => o.key === range)?.label.replace("…", "") ??
    "Today";

  const finalized = (data?.closed ?? 0) + (data?.canceled ?? 0);
  const closeRate =
    finalized > 0 ? Math.round(((data?.closed ?? 0) / finalized) * 100) : null;

  const tiles = [
    { label: "Open Jobs", value: data?.openJobs ?? 0, href: "/dashboard/jobs" },
    { label: "Created", value: data?.created ?? 0 },
    {
      label: closeRate != null ? `Closed (${closeRate}%)` : "Closed",
      value: data?.closed ?? 0,
    },
    { label: "Revenue", value: money(data?.revenue ?? 0) },
    {
      label: "Unread SMS",
      value: data?.unreadSms ?? 0,
      href: "/dashboard/chat",
      highlight: (data?.unreadSms ?? 0) > 0,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* HEADER + RANGE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-gray-500 text-sm">{rangeLabel} at a glance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="border rounded p-2 text-sm bg-white dark:bg-gray-900"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          {range === "custom" && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="border rounded p-2 text-sm bg-white dark:bg-gray-900"
              />
              <span className="text-gray-400 text-sm">→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="border rounded p-2 text-sm bg-white dark:bg-gray-900"
              />
            </>
          )}
        </div>
      </div>

      {/* KPI TILES */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {tiles.map((t) => (
          <button
            key={t.label}
            onClick={() => t.href && router.push(t.href)}
            className={`text-left border rounded-lg p-4 bg-white dark:bg-gray-900 transition-colors ${
              t.href
                ? "hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                : "cursor-default"
            } ${t.highlight ? "border-green-500" : ""}`}
          >
            <div className="text-2xl font-bold">{loading ? "—" : t.value}</div>
            <div className="text-xs text-gray-500 mt-1">{t.label}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* UNASSIGNED JOBS */}
        <div className="border rounded-lg bg-white dark:bg-gray-900">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold">Unassigned Jobs</h2>
            <span className="text-xs text-gray-400">
              {data?.unassigned.length ?? 0}
            </span>
          </div>
          <div className="divide-y">
            {!loading && (data?.unassigned.length ?? 0) === 0 && (
              <p className="text-sm text-gray-400 p-4">
                Nothing waiting for dispatch. 🎉
              </p>
            )}
            {data?.unassigned.map((j) => (
              <button
                key={j.shortId}
                onClick={() => router.push(`/dashboard/jobs/${j.shortId}`)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {j.customerName || "—"}{" "}
                    <span className="font-mono text-xs text-gray-400">
                      {j.shortId}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {formatPhone(j.customerPhone)} · {j.status}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* TODAY'S APPOINTMENTS */}
        <div className="border rounded-lg bg-white dark:bg-gray-900">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold">Today&apos;s Appointments</h2>
            <span className="text-xs text-gray-400">
              {data?.appointments.length ?? 0}
            </span>
          </div>
          <div className="divide-y">
            {!loading && (data?.appointments.length ?? 0) === 0 && (
              <p className="text-sm text-gray-400 p-4">
                No appointments scheduled for today.
              </p>
            )}
            {data?.appointments.map((j) => (
              <button
                key={j.shortId}
                onClick={() => router.push(`/dashboard/jobs/${j.shortId}`)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="text-sm font-semibold w-16 shrink-0">
                  {timeOnly(j.scheduledAt)}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {j.customerName || "—"}{" "}
                    <span className="font-mono text-xs text-gray-400">
                      {j.shortId}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {j.technician || "Unassigned"} · {j.status}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
