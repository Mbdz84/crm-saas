"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  value: string | null;
  onChange: (v: string) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

function label12(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${ampm}`;
}

// 15-minute slots for a full day (00:00 → 23:45)
const SLOTS = Array.from({ length: 96 }, (_, i) => {
  const total = i * 15;
  return { total, label: label12(total) };
});

export default function AppointmentPicker({ value, onChange }: Props) {
  const parsed = value ? new Date(value) : null;

  const [dateStr, setDateStr] = useState(
    parsed
      ? `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(
          parsed.getDate()
        )}`
      : ""
  );
  const [minutesOfDay, setMinutesOfDay] = useState<number | null>(
    parsed
      ? parsed.getHours() * 60 +
          (parsed.getMinutes() - (parsed.getMinutes() % 15))
      : null
  );
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Emit ISO (built in LOCAL time) whenever both parts are set
  useEffect(() => {
    if (!dateStr || minutesOfDay == null) return;
    const [y, m, dd] = dateStr.split("-").map(Number);
    const d = new Date(
      y,
      m - 1,
      dd,
      Math.floor(minutesOfDay / 60),
      minutesOfDay % 60,
      0,
      0
    );
    onChange(d.toISOString());
  }, [dateStr, minutesOfDay]);

  // Scroll the selected time into view when opening
  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.querySelector<HTMLElement>(
        '[data-selected="true"]'
      );
      el?.scrollIntoView({ block: "center" });
    }
  }, [open]);

  const selectedLabel =
    minutesOfDay != null ? label12(minutesOfDay) : "Select time";
  const endsAt =
    minutesOfDay == null ? "-" : label12((minutesOfDay + 120) % 1440);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
      {/* DATE (native) */}
      <input
        type="date"
        className="border rounded p-2 w-full sm:w-auto"
        value={dateStr}
        onChange={(e) => setDateStr(e.target.value)}
      />

      {/* TIME (custom slot dropdown) */}
      <div className="relative w-full sm:w-40" ref={boxRef}>
        <button
          type="button"
          onClick={() => {
            setOpen((o) => {
              const next = !o;
              if (next && boxRef.current) {
                const rect = boxRef.current.getBoundingClientRect();
                // Not enough room below? open upward.
                setDropUp(window.innerHeight - rect.bottom < 260);
              }
              return next;
            });
          }}
          className="border rounded p-2 w-full text-left flex justify-between items-center bg-white dark:bg-gray-800"
        >
          <span className={minutesOfDay == null ? "text-gray-400" : ""}>
            {selectedLabel}
          </span>
          <span className="text-gray-400">▾</span>
        </button>

        {open && (
          <div
            ref={listRef}
            className={`absolute z-30 w-full max-h-60 overflow-y-auto border rounded bg-white dark:bg-gray-800 shadow-lg ${
              dropUp ? "bottom-full mb-1" : "top-full mt-1"
            }`}
          >
            {SLOTS.map((s) => {
              const selected = s.total === minutesOfDay;
              return (
                <button
                  key={s.total}
                  type="button"
                  data-selected={selected}
                  onClick={() => {
                    setMinutesOfDay(s.total);
                    setOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-1.5 text-sm ${
                    selected
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-300">
        Ends at: {endsAt}
      </div>
    </div>
  );
}
