// crm-frontend/app/dashboard/jobs/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface JobStatusMeta {
  id: string;
  name: string;
  color: string;
  order: number;
  active: boolean;
  locked: boolean;
}

interface Technician {
  id: string;
  name: string;
}

interface LeadSource {
  id?: string;
  name: string;
}

interface Job {
  id: string;
  shortId?: string;
  title: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  scheduledAt?: string | null;

  status: string;
  jobStatus?: JobStatusMeta | null;

  technician?: Technician | null;
  source?: LeadSource | null;

  createdAt: string;
  closedAt?: string | null;
  canceledAt?: string | null;
}

/* ------------------------------------------------------------
   COLUMN VISIBILITY TYPES
------------------------------------------------------------ */
type ColumnKey =
  | "shortId"
  | "customer"
  | "phone"
  | "address"
  | "technician"
  | "status"
  | "source"
  | "appointment"
  | "createdAt"
  | "quick";

type ColumnVisibility = Record<ColumnKey, boolean>;

const BOARD_HIDE_MS = 45 * 60 * 1000; // 45 minutes

// Format phone numbers like (630) 697-8143
function formatPhone(raw?: string | null): string {
  if (!raw) return "-";

  const digits = raw.replace(/\D/g, ""); // keep only digits
  if (digits.length < 10) return raw;

  const last10 = digits.slice(-10);
  const area = last10.slice(0, 3);
  const pre = last10.slice(3, 6);
  const line = last10.slice(6);

  return `(${area}) ${pre}-${line}`;
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  const [columnsVisible, setColumnsVisible] = useState<ColumnVisibility>({
    shortId: true,
    customer: true,
    phone: true,
    address: true,
    technician: true,
    status: true,
    source: true,
    appointment: true,
    createdAt: false,
    quick: true,
  });

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

  /* ------------------------------------------------------------
     FILTER + HIDE CLOSED/CANCELED OLDER THAN 45 MIN
  ------------------------------------------------------------ */
  const filteredJobs = useMemo(() => {
    const now = Date.now();

    return jobs
      .filter((job) => {
        // Hide closed/canceled jobs after 45 minutes
        const statusName = job.jobStatus?.name || job.status || "Unknown";

        if (["Closed", "Canceled", "Cancelled"].includes(statusName)) {
          const ts = job.closedAt || job.canceledAt;
          if (ts) {
            const age = now - new Date(ts).getTime();
            if (age > BOARD_HIDE_MS) return false;
          }
        }

        // Text search
        const text = (
          (job.shortId || "") +
          " " +
          job.title +
          " " +
          (job.customerName || "") +
          " " +
          (job.customerPhone || "") +
(job.customerPhone?.replace(/\D/g, "") || "") +  // normalized digits
          " " +
          (job.customerAddress || "") +
          " " +
          (job.source?.name || "")
        )
          .toLowerCase()
          .trim();

        return text.includes(search.toLowerCase().trim());
      })
      .sort((a, b) => {
        // Sort primarily by status order, then createdAt desc
        const aOrder = a.jobStatus?.order ?? 999;
        const bOrder = b.jobStatus?.order ?? 999;
        if (aOrder !== bOrder) return aOrder - bOrder;

        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [jobs, search]);

  /* ------------------------------------------------------------
     GROUP BY STATUS
  ------------------------------------------------------------ */
  const groupedByStatus = useMemo(() => {
    const groups: Record<
      string,
      { statusName: string; color: string; order: number; jobs: Job[] }
    > = {};

    filteredJobs.forEach((job) => {
      const meta = job.jobStatus;
      const statusName = meta?.name || job.status || "Unknown";
      const color = meta?.color || "#e5e7eb";
      const order = meta?.order ?? 999;

      if (!groups[statusName]) {
        groups[statusName] = { statusName, color, order, jobs: [] };
      }

      groups[statusName].jobs.push(job);
    });

    return Object.values(groups).sort((a, b) => a.order - b.order);
  }, [filteredJobs]);

  /* ------------------------------------------------------------
     APPOINTMENT RANGE FORMATTER
  ------------------------------------------------------------ */
  function formatApptRange(iso?: string | null): string {
  if (!iso) return "-";

  const start = new Date(iso);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const fmt = (d: Date) =>
    d.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  return `${fmt(start)} → ${fmt(end)}`;
}

function formatApptDate(iso?: string | null): string {
  if (!iso) return "-";

  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatAddress(addr?: string | null) {
  if (!addr) return "-";
  const parts = addr.split(",");
  if (parts.length < 2) return addr;

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
  if (loading) return <div className="p-6">Loading jobs...</div>;

  const columnKeysInOrder: ColumnKey[] = [
    "shortId",
    "customer",
    "phone",
    "address",
    "technician",
    "status",
    "source",
    "appointment",
    "createdAt",
    "quick",
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* HEADER + ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Job Board</h1>
          <p className="text-gray-500 text-sm">
            Live jobs grouped by status. Closed and canceled jobs disappear from
            this board 45 minutes after they are completed.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() =>
              setShowColumnPicker((prev) => !prev)
            }
            className="px-3 py-2 border rounded text-sm bg-white hover:bg-gray-50"
          >
            Columns
          </button>

          <button
            onClick={() => router.push("/dashboard/jobs/new")}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
          >
            + New Job
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <input
          className="border rounded px-3 py-2 w-full md:max-w-md dark:bg-gray-900"
          placeholder="Search by ID, name, phone, address, lead source..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-xs text-gray-500">
          Tip: type short ID like <b>X9D2E</b>
        </span>
      </div>

      {/* COLUMN VISIBILITY PANEL */}
      {showColumnPicker && (
        <div className="border rounded p-3 bg-gray-50">
          <h3 className="font-semibold mb-2 text-sm">Show / Hide Columns</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            {columnKeysInOrder.map((key) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={columnsVisible[key]}
                  onChange={() =>
                    setColumnsVisible((prev) => ({
                      ...prev,
                      [key]: !prev[key],
                    }))
                  }
                />
                {labelForColumn(key)}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* NO JOBS */}
      {groupedByStatus.length === 0 && (
        <div className="border rounded p-4 text-center text-gray-500">
          No active jobs on the board. Closed/canceled jobs older than 45
          minutes are hidden here but still available in Reports.
        </div>
      )}

      {/* GROUPS BY STATUS */}
      {groupedByStatus.map((group) => (
        <section key={group.statusName} className="space-y-2">
          {/* STATUS HEADER */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: group.color || "#e5e7eb",
                  color: "#111827",
                }}
              >
                {group.statusName}
              </span>
              <span className="text-xs text-gray-500">
                {group.jobs.length} job
                {group.jobs.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block border rounded bg-white dark:bg-gray-900 overflow-auto">
            <table className="w-full text-sm table-fixed min-w-[1100px]">
              <thead className="bg-gray-100 dark:bg-gray-800">
  <tr>
    {columnsVisible.shortId && (
      <th className="p-2 text-left w-20">Job ID</th>
    )}
    {columnsVisible.customer && (
      <th className="p-2 text-left w-32">Customer</th>
    )}
    {columnsVisible.phone && (
      <th className="p-2 text-left w-32">Phone</th>
    )}
    {columnsVisible.address && (
      <th className="p-2 text-left w-64">Address</th>
    )}
    {columnsVisible.technician && (
      <th className="p-2 text-left w-28">Tech</th>
    )}
    {columnsVisible.status && (
      <th className="p-2 text-left w-28">Status</th>
    )}
    {columnsVisible.source && (
      <th className="p-2 text-left w-32">Lead Source</th>
    )}
    {columnsVisible.appointment && (
      <th className="p-2 text-left w-40">Appt Time</th>
    )}
    {columnsVisible.createdAt && (
      <th className="p-2 text-left w-32">Created</th>
    )}
    {columnsVisible.quick && (
      <th className="p-2 text-right w-24">Quick</th>
    )}
  </tr>
</thead>
              <tbody>
                {group.jobs.map((job) => {
                  const short = job.shortId || job.id.slice(0, 5);
                  const statusName =
                    job.jobStatus?.name || job.status || "Unknown";

                  return (
                    <tr
                      key={job.id}
                      className="border-t hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={(e) => {
                        // prevent row click when clicking on actions
                        const target = e.target as HTMLElement;
                        if (
                          target.closest("[data-action-btn]") ||
                          target.tagName.toLowerCase() === "button" ||
                          target.tagName.toLowerCase() === "a"
                        ) {
                          return;
                        }
                        router.push(`/dashboard/jobs/${short}`);
                      }}
                    >
                      {columnsVisible.shortId && (
                        <td className="p-2 font-mono text-xs">{short}</td>
                      )}
                      {columnsVisible.customer && (
                        <td className="p-2">{job.customerName || "-"}</td>
                      )}
                      {columnsVisible.phone && (
                        <td className="p-2">{formatPhone(job.customerPhone)}</td>
                      )}
                      {columnsVisible.address && (
  <td className="p-2 whitespace-pre-line">
    {formatAddress(job.customerAddress)}
  </td>
)}
                      {columnsVisible.technician && (
                        <td className="p-2">{job.technician?.name || "-"}</td>
                      )}
                      {columnsVisible.status && (
                        <td className="p-2">{statusName}</td>
                      )}
                      {columnsVisible.source && (
                        <td className="p-2">{job.source?.name || "-"}</td>
                      )}
                      {columnsVisible.appointment && (
  <td className="p-2 leading-tight">
    <div className="font-medium">
      {formatApptRange(job.scheduledAt)}
    </div>
    <div className="text-xs text-gray-500">
      {formatApptDate(job.scheduledAt)}
    </div>
  </td>
)}
                      {columnsVisible.createdAt && (
  <td className="p-2 leading-tight">
    <div className="text-sm">
      {new Date(job.createdAt).toLocaleDateString()}
    </div>
    <div className="text-xs text-gray-500">
      {new Date(job.createdAt).toLocaleTimeString()}
    </div>
  </td>
)}
                      

                      {/* QUICK ACTIONS */}
                      {columnsVisible.quick && (
                      <td className="p-2">
                        <div className="flex justify-end gap-2 text-lg">
                          {/* Call */}
                          <button
                            data-action-btn
                            title="Call customer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!job.customerPhone) return;
                              window.location.href = `tel:${job.customerPhone}`;
                            }}
                            className="hover:text-blue-600"
                          >
                            📞
                          </button>

                          {/* Directions */}
                          <button
                            data-action-btn
                            title="Directions"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!job.customerAddress) return;
                              const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                job.customerAddress
                              )}`;
                              window.open(url, "_blank");
                            }}
                            className="hover:text-green-600"
                          >
                            📍
                          </button>

                          {/* ===================== */}
                          {/* add extra buttons.... */}
                          {/* ===================== */}

                        </div>
                      </td>
                      )}
                    </tr>
                  );
                })}

                {group.jobs.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-4 text-center text-gray-500"
                    >
                      No jobs in this status.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="md:hidden space-y-2">
            {group.jobs.map((job) => {
              const short = job.shortId || job.id.slice(0, 5);
              const statusName =
                job.jobStatus?.name || job.status || "Unknown";

              return (
                <div
                  key={job.id}
                  className="border rounded bg-white dark:bg-gray-900 p-3 shadow-sm"
                  onClick={() => router.push(`/dashboard/jobs/${short}`)}
                >
                  <div className="flex justify-between items-start mb-1">
  <div className="font-mono text-xs font-semibold">
    #{short}
  </div>

  <div className="text-right leading-tight">
     <div className="text-[11px] text-gray-400">
      {new Date(job.createdAt).toLocaleDateString(undefined, {
  month: "short",
  day: "2-digit",
  year: "numeric",
})}
    </div>
    <div className="text-xs text-gray-500">
      {new Date(job.createdAt).toLocaleTimeString()}
    </div>
     </div>
</div>

                  <div className="text-sm font-semibold">
                    {job.customerName || "No name"}
                  </div>
                  <div className="text-xs text-gray-500">
  {formatPhone(job.customerPhone)}
</div>

                  {job.customerAddress && (
                    <div className="text-xs text-gray-500 mt-1">
                      {job.customerAddress}
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-2 text-xs text-gray-600">
                    <span>{job.technician?.name || "No tech"}</span>
                    <span>{job.source?.name || "No source"}</span>
                  </div>

                  {job.scheduledAt && (
  <div className="mt-1 text-xs text-blue-600 font-semibold">
    🕒 {formatApptRange(job.scheduledAt)}
    <div className="text-[11px] text-gray-500 font-normal">
      {formatApptDate(job.scheduledAt)}
    </div>
  </div>
)}



                  {/* QUICK ACTIONS (BIG TOUCH TARGETS) */}
                  <div
                    className="flex justify-between mt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="flex-1 mr-1 py-1 text-xs border rounded flex items-center justify-center gap-1"
                      onClick={() => {
                        if (!job.customerPhone) return;
                        window.location.href = `tel:${job.customerPhone}`;
                      }}
                    >
                      📞 Call
                    </button>
                    <button
                      className="flex-1 mx-1 py-1 text-xs border rounded flex items-center justify-center gap-1"
                      onClick={() => {
                        if (!job.customerAddress) return;
                        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          job.customerAddress
                        )}`;
                        window.open(url, "_blank");
                      }}
                    >
                      📍 Directions
                    </button>
                    <button
                      className="flex-1 ml-1 py-1 text-xs border rounded flex items-center justify-center gap-1"
                      onClick={() => router.push(`/dashboard/jobs/${short}`)}
                    >
                      📝 Job
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------
   LABEL HELPER
------------------------------------------------------------ */
function labelForColumn(key: ColumnKey): string {
  switch (key) {
    case "shortId":
      return "Job ID";
    case "customer":
      return "Customer";
    case "phone":
      return "Phone";
    case "address":
      return "Address";
    case "technician":
      return "Tech";
    case "status":
      return "Status";
    case "source":
      return "Lead Source";
    case "appointment":
      return "Appt Time";
    case "createdAt":
      return "Created";
    case "quick":
      return "Quick Actions";
    default:
      return key;
  }
}