"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SearchJob {
  id: string;
  shortId: string;
  customerName: string | null;
  customerPhone: string | null;
  customerPhone2?: string | null;
  customerAddress: string | null;
  createdAt: string;
  canceledReason?: string | null;
  jobStatus?: { name: string } | null;
  technician?: { name: string | null } | null;
  closing?: {
    totalAmount?: number | string | null;
  };
}
function statusClass(status?: string | null) {
  if (!status) return "";

  const s = status.toLowerCase();
  if (s === "canceled" || s === "cancelled") {
    return "text-red-600 font-semibold";
  }
  if (s === "closed") {
    return "text-green-600 font-semibold";
  }
  return "";
}
/* -------------------------------
   Helpers
-------------------------------- */
function formatPhone(num?: string | null) {
  if (!num) return "";
  const d = num.replace(/[^\d]/g, "");
  if (d.length < 10) return num;
  const n = d.slice(-10);
  return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
}

function getValue(job: SearchJob, key: string) {
  switch (key) {
    case "totalAmount":
      return Number(job.closing?.totalAmount ?? 0);
    case "status":
      return job.jobStatus?.name ?? "";
    case "tech":
      return job.technician?.name ?? "";
    case "createdAt":
      return new Date(job.createdAt).getTime();
    default:
      return (job as any)[key] ?? "";
  }
}

export default function JobSearchPage() {
  const router = useRouter();
  const base = process.env.NEXT_PUBLIC_API_URL;

  const [q, setQ] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [results, setResults] = useState<SearchJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function sortBy(key: string) {
    const dir =
      sortKey === key && sortDir === "asc" ? "desc" : "asc";

    setSortKey(key);
    setSortDir(dir);

    setResults((prev) =>
      [...prev].sort((a, b) => {
        const av = getValue(a, key);
        const bv = getValue(b, key);

        if (typeof av === "number" && typeof bv === "number") {
          return dir === "asc" ? av - bv : bv - av;
        }

        return dir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      })
    );
  }

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setTouched(true);
    if (!base) return alert("API base URL missing");

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`${base}/jobs/search?${params}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) return alert(data.error || "Search failed");
      setResults(data.results || []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Search Jobs</h1>
        <button
          onClick={() => router.push("/dashboard/jobs")}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          Back
        </button>
      </div>

      {/* SEARCH */}
      <form
        onSubmit={runSearch}
        className="border rounded p-4 bg-white space-y-3"
      >
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Name, job #, phone, address, notes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="grid grid-cols-3 gap-3">
          <input type="date" className="border px-3 py-2 rounded" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input type="date" className="border px-3 py-2 rounded" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <button className="bg-blue-600 text-white rounded font-semibold">
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      {/* RESULT COUNT */}
      {touched && (
        <div className="text-sm text-gray-600 px-1">
          <b>{results.length}</b> job{results.length !== 1 && "s"} found
        </div>
      )}

      {/* TABLE */}
      {results.length > 0 && (
        <div className="border rounded bg-white overflow-x-auto">
          <table className="min-w-full text-sm table-fixed">
            <thead className="bg-gray-100">
              <tr>
                <th onClick={() => sortBy("shortId")} className="px-3 py-2 cursor-pointer">Job #</th>
                <th onClick={() => sortBy("customerName")} className="px-3 py-2 cursor-pointer">Customer</th>
                <th onClick={() => sortBy("customerPhone")} className="px-3 py-2 cursor-pointer">Phone</th>
                <th onClick={() => sortBy("customerAddress")} className="px-3 py-2 cursor-pointer">Address</th>
                <th onClick={() => sortBy("status")} className="px-3 py-2 cursor-pointer">Status</th>
                <th onClick={() => sortBy("totalAmount")} className="px-3 py-2 cursor-pointer text-right">Total $</th>
                <th onClick={() => sortBy("tech")} className="px-3 py-2 cursor-pointer">Tech</th>
                <th onClick={() => sortBy("createdAt")} className="px-3 py-2 cursor-pointer">Created</th>
                <th onClick={() => sortBy("canceledReason")} className="px-3 py-2 cursor-pointer">Cancel Reason</th>
              </tr>
            </thead>

            <tbody>
              {results.map((job) => (
                <tr
                  key={job.id}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/jobs/${job.shortId}`)}
                >
                  <td className="px-3 py-2 font-mono">{job.shortId}</td>
                  <td className="px-3 py-2">{job.customerName || "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatPhone(job.customerPhone) ||
                      formatPhone(job.customerPhone2) ||
                      "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
  {job.customerAddress ? (
    (() => {
      const parts = job.customerAddress.split(",");
      const line1 = parts.shift(); // street
      const line2 = parts.join(",").trim(); // city, state, zip

      return (
        <>
          <div>{line1},</div>
          <div className="text-xs text-gray-500">{line2}</div>
        </>
      );
    })()
  ) : (
    "-"
  )}
</td>
                  <td className={`px-3 py-2 ${statusClass(job.jobStatus?.name)}`}>{job.jobStatus?.name || "—"}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {job.closing?.totalAmount != null
                      ? `$${Number(job.closing.totalAmount).toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{job.technician?.name || "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
  {(() => {
    const d = new Date(job.createdAt);
    return (
      <>
        <div>{d.toLocaleDateString()}</div>
        <div className="text-xs text-gray-500">
          {d.toLocaleTimeString()}
        </div>
      </>
    );
  })()}
</td>
                  <td className="px-3 py-2">{job.canceledReason || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}