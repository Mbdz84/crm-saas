"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SearchJob {
  id: string;
  shortId: string;
  title: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerPhone2?: string | null;
  customerAddress: string | null;
  createdAt: string;
  canceledReason?: string | null;
  jobStatus?: { name: string } | null;
  technician?: { name: string | null } | null;
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

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setTouched(true);

    if (!base) {
      alert("API base URL is not configured");
      return;
    }

    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`${base}/jobs/search?` + params.toString(), {
        credentials: "include",
      })
      ;

      const data = await res.json();
      if (!res.ok) {
        console.error("SEARCH ERROR", data);
        alert(data.error || "Search failed");
        return;
      }

      setResults(data.results || []);
    } catch (err) {
      console.error(err);
      alert("Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Search Jobs</h1>
        <button
          onClick={() => router.push("/dashboard/jobs")}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded"
        >
          Back to Jobs
        </button>
      </div>

      {/* SEARCH FORM */}
      <form
        onSubmit={runSearch}
        className="border rounded p-4 bg-white dark:bg-gray-900 space-y-3"
      >
        <div>
          <label className="block text-sm font-medium mb-1">
            Search term
          </label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            placeholder="Name, job #, phone, address, notes, cancel reason..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              From date (created)
            </label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              To date (created)
            </label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>
      </form>

      {/* RESULTS */}
      <div className="border rounded bg-white dark:bg-gray-900">
        {loading && (
          <p className="p-4 text-sm text-gray-500">Searching…</p>
        )}

        {!loading && touched && results.length === 0 && (
          <p className="p-4 text-sm text-gray-500">
            No jobs found. Try a different keyword or date.
          </p>
        )}

        {!loading && results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="px-3 py-2 text-left">Job #</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Phone</th>
                  <th className="px-3 py-2 text-left">Address</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Tech</th>
                  <th className="px-3 py-2 text-left">Created</th>
                  <th className="px-3 py-2 text-left">Cancel Reason</th>
                </tr>
              </thead>
              <tbody>
                {results.map((job) => (
                  <tr
                    key={job.id}
                    className="border-t hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() =>
                      router.push(`/dashboard/jobs/${job.shortId}`)
                    }
                  >
                    <td className="px-3 py-2 font-mono">
                      {job.shortId || job.id.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2">
                      {job.customerName || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {job.customerPhone ||
                        job.customerPhone2 ||
                        "-"}
                    </td>
                    <td className="px-3 py-2 truncate max-w-xs">
                      {job.customerAddress || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {job.jobStatus?.name || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {job.technician?.name || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 truncate max-w-xs">
                      {job.canceledReason || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}