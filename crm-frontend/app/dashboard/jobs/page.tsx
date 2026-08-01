// crm-frontend/app/dashboard/jobs/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  customerPhone2?: string | null;
  // Masked dial strings ("<maskedNumber>,<ext>") — present for technician users
  // who dial through the masked line instead of the real customer number.
  maskedDial?: string | null;
  maskedDial2?: string | null;
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
  | "createdAt";

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

  type SortKey =
    | "phone"
    | "address"
    | "technician"
    | "source"
    | "appointment"
    | "createdAt";

  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

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
  });

  const base = process.env.NEXT_PUBLIC_API_URL;

  // Multi-select delete
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // Which mobile card has its "pick a phone number" menu open (job id)
  const [phoneMenuJobId, setPhoneMenuJobId] = useState<string | null>(null);

  // Close the phone picker when the user scrolls (capture=true also catches
  // scrolling inside the dashboard's scroll container, not just the window).
  useEffect(() => {
    if (!phoneMenuJobId) return;
    const close = () => setPhoneMenuJobId(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [phoneMenuJobId]);

  function toggleSelect(shortId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(shortId)) next.delete(shortId);
      else next.add(shortId);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
    setShowDeleteModal(false);
    setDeleteConfirm("");
  }

  async function handleBulkDelete() {
    const shortIds = Array.from(selectedIds);
    if (shortIds.length === 0) return;
    try {
      const res = await fetch(`${base}/jobs/bulk-delete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete");
        return;
      }
      toast.success(`Deleted ${data.deleted} job(s)`);
      // Remove them from the board immediately
      setJobs((prev: any[]) =>
        prev.filter((j) => !selectedIds.has(j.shortId))
      );
      exitSelectMode();
    } catch {
      toast.error("Failed to delete");
    }
  }

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

useEffect(() => {
  const saved = localStorage.getItem("jobs.columns");
  if (saved) {
    try {
      setColumnsVisible(JSON.parse(saved));
    } catch {}
  }
}, []);

  /* ------------------------------------------------------------
     FILTER + HIDE CLOSED/CANCELED OLDER THAN 45 MIN
  ------------------------------------------------------------ */
  const filteredJobs = useMemo(() => {
  const now = Date.now();

  return jobs.filter((job) => {
    const statusName = job.jobStatus?.name || job.status || "Unknown";

    if (["Closed", "Canceled", "Cancelled"].includes(statusName)) {
      const ts = job.closedAt || job.canceledAt;
      if (ts) {
        const age = now - new Date(ts).getTime();
        if (age > BOARD_HIDE_MS) return false;
      }
    }

    const text = (
      (job.shortId || "") +
      " " +
      job.title +
      " " +
      (job.customerName || "") +
      " " +
      (job.customerPhone || "") +
      (job.customerPhone?.replace(/\D/g, "") || "") +
      " " +
      (job.customerAddress || "") +
      " " +
      (job.source?.name || "")
    )
      .toLowerCase()
      .trim();

    return text.includes(search.toLowerCase().trim());
  });
}, [jobs, search]);

  /* ------------------------------------------------------------
     GROUP BY STATUS
  ------------------------------------------------------------ */
  const groupedByStatus = useMemo(() => {
  const map = new Map<
    string,
    { statusName: string; color: string; order: number; jobs: Job[] }
  >();

  // build groups
  filteredJobs.forEach((job) => {
    const meta =
  job.jobStatus ??
  {
    name: job.status,
    color: "#e5e7eb",
    order: 999,
  };
    const statusName = meta?.name || job.status || "Unknown";

    if (!map.has(statusName)) {
      map.set(statusName, {
        statusName,
        color: meta?.color || "#e5e7eb",
        order: meta?.order ?? 999,
        jobs: [],
      });
    }

    map.get(statusName)!.jobs.push(job);
  });

  // sort jobs INSIDE each group
  map.forEach((group) => {
    group.jobs.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;

      const getVal = (job: Job) => {
        switch (sortKey) {
          case "phone":
            return job.customerPhone || "";
          case "address":
            return job.customerAddress || "";
          case "technician":
            return job.technician?.name || "";
          case "source":
            return job.source?.name || "";
          case "appointment":
            return job.scheduledAt
              ? new Date(job.scheduledAt).getTime()
              : 0;
          case "createdAt":
          default:
            return new Date(job.createdAt).getTime();
        }
      };

      const aVal = getVal(a);
      const bVal = getVal(b);

      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });
  });

  // sort groups by fixed status order ONLY
  return Array.from(map.values()).sort((a, b) => a.order - b.order);
}, [filteredJobs, sortKey, sortDir]);

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
            onClick={() =>
              selectMode ? exitSelectMode() : setSelectMode(true)
            }
            className={`px-3 py-2 border rounded text-sm ${
              selectMode
                ? "bg-gray-100 hover:bg-gray-200"
                : "bg-white hover:bg-gray-50 text-red-600 border-red-300"
            }`}
          >
            {selectMode ? "Cancel" : "Delete Jobs"}
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
          className="border rounded px-3 py-2 w-full md:max-w-2xl dark:bg-gray-900"
          placeholder="Search by ID, name, phone, address, lead source…  (Tip: type short ID like X9D2E)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
            <div className="mt-3 flex justify-end">
  <button
    onClick={() => {
      localStorage.setItem(
        "jobs.columns",
        JSON.stringify(columnsVisible)
      );
      setShowColumnPicker(false);
    }}
    className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
  >
    Save Columns
  </button>
</div>
          </div>
       </div>
      )}

      {/* SELECT / DELETE TOOLBAR */}
      {selectMode && (
        <div className="flex items-center justify-between border border-red-300 rounded p-2 bg-red-50 dark:bg-red-950/30">
          <span className="text-sm">
            Select jobs to delete — <b>{selectedIds.size}</b> selected
          </span>
          <button
            disabled={selectedIds.size === 0}
            onClick={() => {
              setDeleteConfirm("");
              setShowDeleteModal(true);
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded text-sm disabled:opacity-50"
          >
            Delete Selected
          </button>
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
          <div className="flex items-center justify-between gap-3 mt-4">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold"
              style={{
                color: `color-mix(in srgb, ${group.color || "#6b7280"} 72%, #000)`,
                backgroundColor: `color-mix(in srgb, ${group.color || "#6b7280"} 18%, #fff)`,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: group.color || "#6b7280" }}
              />
              {group.statusName}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {group.jobs.length} job
              {group.jobs.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block border rounded bg-white dark:bg-gray-900 overflow-auto">
            <table className="w-full text-sm table-fixed min-w-[1100px]">
              <thead className="bg-gray-100 dark:bg-gray-800">
  <tr>
    {selectMode && <th className="p-2 w-8"></th>}
    {columnsVisible.shortId && (
      <th className="p-2 text-left w-20">Job ID</th>
    )}
    {columnsVisible.customer && (
      <th className="p-2 text-left w-32">Customer</th>
    )}
    {columnsVisible.phone && (
      <th className="p-2 text-left w-32 cursor-pointer select-none"
  onClick={() => toggleSort("phone")}>Phone</th>
    )}
    {columnsVisible.address && (
      <th
  className="p-2 text-left w-64 cursor-pointer select-none"
  onClick={() => toggleSort("address")}
>
  Address
</th>
    )}
    {columnsVisible.technician && (
      <th
  className="p-2 text-left w-28 cursor-pointer select-none"
onClick={() => toggleSort("technician")}
>
  Tech
</th>
    )}
    {columnsVisible.status && (
      <th className="p-2 text-left w-28">Status</th>
    )}
    {columnsVisible.source && (
      <th
  className="p-2 text-left w-32 cursor-pointer select-none"
onClick={() => toggleSort("source")}
>
  Lead Source
</th>
    )}
    {columnsVisible.appointment && (
      <th
  className="p-2 text-left w-40 cursor-pointer select-none"
onClick={() => toggleSort("appointment")}
>
  Appt Time
</th>
    )}
    {columnsVisible.createdAt && (
      <th
  className="p-2 text-left w-32 cursor-pointer select-none"
onClick={() => toggleSort("createdAt")}
>
  Created
</th>
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
                      style={{
                        borderLeft: `4px solid ${group.color || "#6b7280"}`,
                      }}
                      className={`border-t hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                        selectMode && selectedIds.has(short)
                          ? "bg-red-50 dark:bg-red-950/30"
                          : ""
                      }`}
                      onClick={(e) => {
                        if (selectMode) {
                          toggleSelect(short);
                          return;
                        }
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
                      {selectMode && (
                        <td
                          className="p-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(short)}
                            onChange={() => toggleSelect(short)}
                          />
                        </td>
                      )}
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

              // Technicians dial the masked number + extension; everyone else
              // dials the real customer number(s). Build the list of options.
              const hasMasked = !!(job.maskedDial || job.maskedDial2);
              const dialOptions = hasMasked
                ? [job.maskedDial, job.maskedDial2]
                    .filter(Boolean)
                    .map((d) => ({ label: d as string, tel: d as string }))
                : [job.customerPhone, job.customerPhone2]
                    .filter(Boolean)
                    .map((p) => ({
                      label: formatPhone(p as string),
                      tel: p as string,
                    }));

              return (
                <div
                  key={job.id}
                  className="border border-l-4 rounded bg-white dark:bg-gray-900 p-3 shadow-sm"
                  style={{ borderLeftColor: group.color || "#6b7280" }}
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
  {dialOptions.length > 0
    ? dialOptions.map((o) => o.label).join(" · ")
    : "-"}
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
                    {/* CALL — dropdown when the job has two numbers */}
                    <div className="flex-1 mr-1 relative">
                      <button
                        className="w-full py-1.5 text-base border rounded flex items-center justify-center gap-1 disabled:opacity-40"
                        disabled={dialOptions.length === 0}
                        onClick={() => {
                          if (dialOptions.length === 0) return;
                          if (dialOptions.length > 1) {
                            // Two numbers → toggle the picker
                            setPhoneMenuJobId((cur) =>
                              cur === job.id ? null : job.id
                            );
                          } else {
                            // One number → dial it directly
                            window.location.href = `tel:${dialOptions[0].tel}`;
                          }
                        }}
                      >
                        📞 Call
                        {dialOptions.length > 1 && " ▾"}
                      </button>

                      {phoneMenuJobId === job.id && dialOptions.length > 1 && (
                        <div className="absolute left-0 bottom-full mb-1 z-10 w-max min-w-full max-w-[85vw] bg-white dark:bg-gray-800 border rounded shadow-lg overflow-hidden">
                          {dialOptions.map((o, i) => (
                            <a
                              key={o.tel}
                              href={`tel:${o.tel}`}
                              className={`block px-4 py-3 text-base whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                i > 0 ? "border-t" : ""
                              }`}
                              onClick={() => setPhoneMenuJobId(null)}
                            >
                              <div className="flex items-center gap-2 font-semibold">
                                📞 Phone {i + 1}
                              </div>
                              <div className="mt-0.5 text-gray-600 dark:text-gray-300">
                                {o.label}
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      className="flex-1 mx-1 py-1.5 text-base border rounded flex items-center justify-center gap-1"
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

                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* DELETE CONFIRM MODAL (type DELETE) */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-5 w-[420px] max-w-full space-y-3 shadow-xl">
            <h3 className="text-lg font-semibold text-red-600">
              Delete {selectedIds.size} job{selectedIds.size === 1 ? "" : "s"}?
            </h3>
            <p className="text-sm text-gray-500">
              This permanently deletes the selected job
              {selectedIds.size === 1 ? "" : "s"} and all related data (logs,
              recordings, closings, reminders). This cannot be undone.
            </p>
            <p className="text-sm">
              Type <b>DELETE</b> to confirm:
            </p>
            <input
              autoFocus
              className="border rounded p-2 w-full dark:bg-gray-800"
              placeholder="DELETE"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                deleteConfirm === "DELETE" &&
                handleBulkDelete()
              }
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleteConfirm !== "DELETE"}
                className="px-3 py-1.5 rounded bg-red-600 text-white text-sm disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
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
      default:
      return key;
  }
}