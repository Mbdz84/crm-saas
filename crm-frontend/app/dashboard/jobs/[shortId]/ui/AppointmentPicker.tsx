"use client";

import { useState, useEffect } from "react";

interface Props {
  value: string | null;
  onChange: (v: string) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

// ISO string → "YYYY-MM-DDTHH:MM" in LOCAL time (datetime-local value format)
function toLocalInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// "YYYY-MM-DDTHH:MM" (local) → Date built in LOCAL time (no UTC day-shift)
function fromLocalInput(v: string): Date | null {
  if (!v) return null;
  const [datePart, timePart] = v.split("T");
  if (!datePart || !timePart) return null;
  const [y, m, dd] = datePart.split("-").map(Number);
  const [h, min] = timePart.split(":").map(Number);
  return new Date(y, m - 1, dd, h, min, 0, 0);
}

export default function AppointmentPicker({ value, onChange }: Props) {
  const [local, setLocal] = useState(toLocalInput(value));

  // Keep in sync if the parent value changes externally (e.g. Clear button)
  useEffect(() => {
    setLocal(toLocalInput(value));
  }, [value]);

  function handleChange(v: string) {
    setLocal(v);
    const d = fromLocalInput(v);
    if (d) onChange(d.toISOString());
  }

  // "Ends at" = start + 2 hours
  const endsAt = (() => {
    const d = fromLocalInput(local);
    if (!d) return "-";
    d.setTime(d.getTime() + 120 * 60 * 1000);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  })();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
      <input
        type="datetime-local"
        step={900} /* 15-minute increments */
        className="border rounded p-2 w-full sm:w-auto"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
      />
      <div className="text-xs text-gray-600 dark:text-gray-300">
        Ends at: {endsAt}
      </div>
    </div>
  );
}
