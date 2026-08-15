"use client";

import { useEffect, useRef, useState } from "react";

/* ============================================================
   PhoneJobHistory
   Shows how many OTHER jobs share this customer phone number,
   as a small clickable badge next to the phone field. Clicking
   opens a dropdown listing those jobs; each opens in a new tab.

   Reuses the existing GET /jobs/search?q=<phone> endpoint, which
   already does a format-proof (digits-only) phone match, is
   company-scoped, and respects technician search permissions.
============================================================ */

type JobHit = {
  id: string;
  shortId: string;
  customerName?: string | null;
  customerAddress?: string | null;
  jobStatus?: { name?: string | null } | null;
  createdAt?: string | null;
};

function fmtPhone(n?: string | null) {
  if (!n) return "";
  const d = n.replace(/[^\d]/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return ten.length === 10
    ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
    : n;
}

export default function PhoneJobHistory({
  phone,
  currentShortId,
  base,
}: {
  phone?: string | null;
  currentShortId?: string | null;
  base?: string;
}) {
  const [jobs, setJobs] = useState<JobHit[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Only search once we have a full 10-digit number.
  const digits = (phone || "").replace(/\D/g, "");
  const ten = digits.length >= 10 ? digits.slice(-10) : "";

  useEffect(() => {
    if (!base || !ten) {
      setJobs([]);
      return;
    }
    let cancelled = false;
    // Debounce so we don't fire on every keystroke while editing.
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${base}/jobs/search?q=${encodeURIComponent(ten)}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        const others: JobHit[] = (data.results || []).filter(
          (j: JobHit) => j.shortId !== currentShortId
        );
        if (!cancelled) setJobs(others);
      } catch {
        if (!cancelled) setJobs([]);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [base, ten, currentShortId]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (jobs.length === 0) return null;

  return (
    <div className="relative mt-1" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 whitespace-nowrap"
        title={`${jobs.length} other job${jobs.length === 1 ? "" : "s"} with this number`}
      >
        {jobs.length} other job{jobs.length === 1 ? "" : "s"}
        <span className="text-[10px]">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-72 max-h-80 overflow-auto rounded-md border bg-white dark:bg-gray-800 shadow-lg">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b">
            Jobs with {fmtPhone(phone)}
          </div>
          {jobs.map((j) => (
            <a
              key={j.id}
              href={`/dashboard/jobs/${j.shortId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 border-b last:border-b-0"
            >
              <div className="font-medium">
                {j.shortId} — {j.customerName || "No name"}
              </div>
              {j.customerAddress && (
                <div className="text-xs text-gray-500 truncate">
                  {j.customerAddress}
                </div>
              )}
              <div className="text-xs text-gray-500">
                {j.jobStatus?.name || "—"}
                {j.createdAt
                  ? " · " + new Date(j.createdAt).toLocaleDateString()
                  : ""}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
