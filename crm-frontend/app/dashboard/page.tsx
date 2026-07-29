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
  createdToday: number;
  closedToday: number;
  revenueToday: number;
  unreadSms: number;
  unassigned: UnassignedJob[];
  appointments: Appointment[];
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

  useEffect(() => {
    if (!base) return;
    (async () => {
      try {
        const res = await fetch(`${base}/dashboard/summary`, {
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) setData(await res.json());
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const tiles = [
    { label: "Open Jobs", value: data?.openJobs ?? 0, href: "/dashboard/jobs" },
    { label: "Created Today", value: data?.createdToday ?? 0 },
    { label: "Closed Today", value: data?.closedToday ?? 0 },
    { label: "Revenue Today", value: money(data?.revenueToday ?? 0) },
    {
      label: "Unread SMS",
      value: data?.unreadSms ?? 0,
      href: "/dashboard/chat",
      highlight: (data?.unreadSms ?? 0) > 0,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-gray-500 text-sm">Today at a glance</p>
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
