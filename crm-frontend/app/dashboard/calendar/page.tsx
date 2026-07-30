"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

const base = process.env.NEXT_PUBLIC_API_URL;

interface CalJob {
  shortId: string;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  scheduledAt: string;
  technician: string | null;
  leadSource: string | null;
  status: string | null;
  color: string | null;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function sameDay(a: Date, b: Date) {
  return dayKey(a) === dayKey(b);
}
function timeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Street on line 1, "City, State ZIP" on line 2 (like the jobs page)
function formatAddress(addr?: string | null) {
  if (!addr) return null;
  const parts = addr.split(",");
  if (parts.length < 2) return <>{addr}</>;
  const line1 = parts[0].trim();
  const line2 = parts.slice(1).join(",").trim();
  return (
    <>
      {line1}
      <br />
      {line2}
    </>
  );
}

export default function CalendarPage() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [monthDate, setMonthDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [jobs, setJobs] = useState<CalJob[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>(dayKey(new Date()));

  // Grid starting on the Sunday on/before the 1st — only as many weeks as
  // needed to cover the month (drop a fully out-of-month trailing week).
  const cells = useMemo(() => {
    const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const startOffset = first.getDay(); // Sun = 0
    const daysInMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0
    ).getDate();
    const weeks = Math.ceil((startOffset + daysInMonth) / 7);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startOffset);
    return Array.from({ length: weeks * 7 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [monthDate]);

  // Fetch appointments for the visible grid range
  useEffect(() => {
    if (!base || cells.length === 0) return;
    const from = cells[0];
    const to = new Date(cells[cells.length - 1]);
    to.setDate(to.getDate() + 1);
    fetch(
      `${base}/jobs/calendar?from=${from.toISOString()}&to=${to.toISOString()}`,
      { credentials: "include", cache: "no-store" }
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CalJob[]) => setJobs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [cells]);

  // Group by local day
  const byDay = useMemo(() => {
    const m: Record<string, CalJob[]> = {};
    for (const j of jobs) {
      const k = dayKey(new Date(j.scheduledAt));
      (m[k] ||= []).push(j);
    }
    return m;
  }, [jobs]);

  const selectedJobs = byDay[selectedKey] || [];
  const monthLabel = monthDate.toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });

  const shiftMonth = (delta: number) =>
    setMonthDate(
      (m) => new Date(m.getFullYear(), m.getMonth() + delta, 1)
    );

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* HEADER */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
              setSelectedKey(dayKey(today));
            }}
            className="px-3 py-1.5 border rounded text-sm bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Today
          </button>
          <button
            onClick={() => shiftMonth(-1)}
            className="p-1.5 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-medium min-w-[8rem] text-center flex-1 md:flex-none">
            {monthLabel}
          </span>
          <button
            onClick={() => shiftMonth(1)}
            className="p-1.5 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* WEEKDAY LABELS */}
      <div className="grid grid-cols-7 text-xs text-gray-500 font-medium">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-1 text-center">
            {w}
          </div>
        ))}
      </div>

      {/* MONTH GRID */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const key = dayKey(d);
          const inMonth = d.getMonth() === monthDate.getMonth();
          const count = byDay[key]?.length || 0;
          const isToday = sameDay(d, today);
          const isSelected = key === selectedKey;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const cellBg = !inMonth
            ? "bg-gray-200 dark:bg-gray-800 text-gray-400" // adjacent month = darker
            : isWeekend
            ? "bg-gray-50 dark:bg-gray-800/40" // weekend = light gray
            : "bg-white dark:bg-gray-900"; // weekday = white
          return (
            <button
              key={key}
              onClick={() => setSelectedKey(key)}
              className={`min-h-[64px] md:min-h-[84px] border rounded-lg p-1.5 text-left flex flex-col transition-colors ${cellBg} ${
                isSelected
                  ? "ring-2 ring-blue-500"
                  : "hover:brightness-95"
              }`}
            >
              <span
                className={`text-base md:text-lg font-semibold ${
                  isToday
                    ? "bg-blue-600 text-white rounded-full w-8 h-8 md:w-9 md:h-9 flex items-center justify-center"
                    : "px-1"
                }`}
              >
                {d.getDate()}
              </span>
              {count > 0 && (
                <span className="mt-auto self-start text-sm md:text-base font-semibold text-blue-600 dark:text-blue-300">
                  {count} job{count === 1 ? "" : "s"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SELECTED DAY PANEL */}
      <div className="border rounded-lg bg-white dark:bg-gray-900">
        <div className="px-4 py-3 border-b font-semibold">
          {(() => {
            const [y, m, dd] = selectedKey.split("-").map(Number);
            return new Date(y, m, dd).toLocaleDateString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
            });
          })()}
          <span className="text-gray-400 font-normal ml-2 text-sm">
            {selectedJobs.length} appointment
            {selectedJobs.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="divide-y">
          {/* Desktop column header */}
          {selectedJobs.length > 0 && (
            <div className="hidden md:flex items-center gap-4 px-4 py-2 text-[11px] uppercase tracking-wide text-gray-400">
              <div className="w-20 shrink-0">Time</div>
              <div className="w-52 shrink-0">Customer</div>
              <div className="flex-1">Address</div>
              <div className="w-40 shrink-0">Technician</div>
              <div className="w-32 shrink-0">Lead Source</div>
              <div className="w-24 shrink-0">Status</div>
            </div>
          )}

          {selectedJobs.length === 0 && (
            <p className="text-sm text-gray-400 p-4">
              No appointments this day.
            </p>
          )}

          {selectedJobs.map((j) => (
            <button
              key={j.shortId}
              onClick={() => router.push(`/dashboard/jobs/${j.shortId}`)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {/* MOBILE: compact stacked */}
              <div className="flex items-start gap-3 md:hidden">
                <div className="text-sm font-semibold w-16 shrink-0">
                  {timeOnly(j.scheduledAt)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    {j.customerName || "—"}{" "}
                    <span className="font-mono text-xs text-gray-400">
                      {j.shortId}
                    </span>
                  </div>
                  {j.customerAddress && (
                    <div className="text-xs text-gray-500">
                      📍 {formatAddress(j.customerAddress)}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 truncate">
                    {j.technician || "Unassigned"}
                    {j.leadSource ? ` · ${j.leadSource}` : ""} · {j.status}
                  </div>
                </div>
              </div>

              {/* DESKTOP: columns spread across the row */}
              <div className="hidden md:flex md:items-start md:gap-4 text-sm">
                <div className="w-20 shrink-0 font-semibold">
                  {timeOnly(j.scheduledAt)}
                </div>
                <div className="w-52 shrink-0 min-w-0 truncate">
                  <span className="font-medium">{j.customerName || "—"}</span>{" "}
                  <span className="font-mono text-xs text-gray-400">
                    {j.shortId}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-gray-600 dark:text-gray-300 whitespace-normal break-words">
                  {j.customerAddress ? (
                    <>📍 {formatAddress(j.customerAddress)}</>
                  ) : (
                    "—"
                  )}
                </div>
                <div className="w-40 shrink-0 truncate text-gray-600 dark:text-gray-300">
                  {j.technician || "Unassigned"}
                </div>
                <div className="w-32 shrink-0 truncate text-gray-600 dark:text-gray-300">
                  {j.leadSource || "—"}
                </div>
                <div className="w-24 shrink-0 truncate">{j.status}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
