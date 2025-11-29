"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Job {
  id: string;
  shortId?: string;
  title: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;

  // FIX → jobStatus exists (returned by backend)
  status: string; 
  jobStatus?: { id: string; name: string } | null;

  technician?: { id: string; name: string } | null;
  createdAt: string;
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const base = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${base}/jobs`, { credentials: "include" });

if (!res.ok) {
  console.warn("JWT expired → redirecting to login");
  router.push("/login");
  return;
}

const data = await res.json();
setJobs(data);
      } catch (err) {
        console.error("LOAD JOBS ERROR", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filtered = jobs.filter((job) => {
    const text = (
      (job.shortId || "") +
      " " +
      job.title +
      " " +
      (job.customerName || "") +
      " " +
      (job.customerPhone || "") +
      " " +
      (job.customerAddress || "")
    )
      .toLowerCase()
      .trim();

    return text.includes(search.toLowerCase().trim());
  });

  if (loading) return <div className="p-6">Loading jobs...</div>;

  return (
    <div className="p-6 space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Jobs</h1>
          <p className="text-gray-500 text-sm">
            Click a row to open job details. Short ID is used everywhere (SMS, search, job page).
          </p>
        </div>

        <button
          onClick={() => router.push("/dashboard/jobs/new")}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          + New Job
        </button>
      </div>

      {/* SEARCH */}
      <div className="flex gap-3 items-center">
        <input
          className="border rounded px-3 py-2 w-full max-w-md dark:bg-gray-900"
          placeholder="Search by ID, name, phone, address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-xs text-gray-500">
          Tip: type short ID like <b>X9D2E</b>
        </span>
      </div>

      {/* TABLE */}
      <div className="border rounded bg-white dark:bg-gray-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="p-2 text-left">Job ID</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Phone</th>
              <th className="p-2 text-left">Address</th>
              <th className="p-2 text-left">Tech</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((job) => {
              const short = job.shortId || job.id.slice(0, 5);

              // FIX — always use jobStatus.name
              const statusName =
                job.jobStatus?.name || job.status || "Unknown";

              return (
                <tr
                  key={job.id}
                  className="border-t hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => router.push(`/dashboard/jobs/${short}`)}
                >
                  <td className="p-2 font-mono text-xs">{short}</td>
                  <td className="p-2">{job.customerName || "-"}</td>
                  <td className="p-2">{job.customerPhone || "-"}</td>
                  <td className="p-2">{job.customerAddress || "-"}</td>
                  <td className="p-2">{job.technician?.name || "-"}</td>

                  {/* FIXED STATUS */}
                  <td className="p-2">{statusName}</td>

                  <td className="p-2">
                    {new Date(job.createdAt).toLocaleString()}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">
                  No jobs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}