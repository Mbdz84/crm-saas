"use client";

import { useState, useEffect } from "react";

interface Props {
  value: string | null;
  onChange: (v: string) => void;
}

export default function AppointmentPicker({ value, onChange }: Props) {
  const parsed = value ? new Date(value) : null;

  const initialDate = parsed ? parsed.toISOString().slice(0, 10) : "";
  const initialHour = parsed ? parsed.getHours() : 12;
  const initialMinute = parsed
    ? parsed.getMinutes() - (parsed.getMinutes() % 15)
    : 0;

  const [date, setDate] = useState(initialDate);
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);

  // Emit updated ISO datetime
  useEffect(() => {
    if (!date) return;

    const d = new Date(date);
    d.setHours(hour);
    d.setMinutes(minute);
    d.setSeconds(0);

    onChange(d.toISOString());
  }, [date, hour, minute]);

  return (
    <div className="space-y-2 w-full">
      {/* DATE + TIME */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
        {/* DATE */}
        <input
          type="date"
          className="border rounded p-2 w-full sm:w-auto"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {/* TIME ROW (WRAPS ON MOBILE) */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* HOUR */}
          <select
            className="border rounded p-2"
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
          >
            {Array.from({ length: 24 }).map((_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}
              </option>
            ))}
          </select>
          <span className="text-sm">hour</span>

          {/* MINUTE */}
          <select
            className="border rounded p-2"
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
          >
            {[0, 15, 30, 45].map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
          <span className="text-sm">min</span>

          {/* END TIME DISPLAY */}
          <div className="text-xs text-gray-600 w-full sm:w-auto">
            Ends at:{" "}
            {(() => {
              if (!date) return "-";
              const end = new Date(date);
              end.setHours(hour);
              end.setMinutes(minute);
              end.setSeconds(0);
              end.setTime(end.getTime() + 120 * 60 * 1000); // +2 hours
              return end.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}