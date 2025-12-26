"use client";

import { useState } from "react";

export default function CanceledTable({
  rows,
  visible,
}: {
  rows: any[];
  visible: Record<string, boolean>;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  if (!rows?.length)
    return (
      <p className="text-gray-500 text-sm mt-4">No canceled jobs found.</p>
    );

  function openJob(job: any) {
    const url = `/dashboard/jobs/${job.shortId}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function toggleRow(id: string) {
    setSelected((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  return (
    <div className="overflow-auto border rounded mt-6">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1 w-8"></th>

            {visible.date && <th className="border px-2 py-1">Date</th>}
            {visible.jobId && <th className="border px-2 py-1">Job ID</th>}
            {visible.customer && (
              <th className="border px-2 py-1">Customer</th>
            )}
            {visible.phones && <th className="border px-2 py-1">Phones</th>}
            {visible.address && <th className="border px-2 py-1">Address</th>}
            {visible.technician && (
              <th className="border px-2 py-1">Technician</th>
            )}
            {visible.leadSource && (
              <th className="border px-2 py-1">Lead Source</th>
            )}
            {visible.canceledReason && (
              <th className="border px-2 py-1">Cancel Reason</th>
            )}
            {visible.description && (
              <th className="border px-2 py-1">Notes / Description</th>
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map((job) => {
            const isChecked = !!selected[job.id];

            return (
              <tr
                key={job.id}
                onClick={() => openJob(job)}
                className={`cursor-pointer transition
                  ${isChecked ? "bg-red-100 hover:bg-red-200" : "hover:bg-blue-50"}
                `}
                title="Open job in new tab"
              >
                {/* CHECKBOX */}
                <td
                  className="border px-2 py-1 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleRow(job.id)}
                  />
                </td>

                {visible.date && (
                  <td className="border px-2 py-1">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </td>
                )}

                {visible.jobId && (
                  <td className="border px-2 py-1 font-mono">
                    {job.shortId}
                  </td>
                )}

                {visible.customer && (
                  <td className="border px-2 py-1">{job.customerName}</td>
                )}

                {visible.phones && (
                  <td className="border px-2 py-1 whitespace-pre-line">
                    {(job.customerPhone || "") +
                      (job.customerPhone2
                        ? "\n" + job.customerPhone2
                        : "")}
                  </td>
                )}

                {visible.address && (
                  <td className="border px-2 py-1">
                    {job.customerAddress}
                  </td>
                )}

                {visible.technician && (
                  <td className="border px-2 py-1">
                    {job.technician?.name || "—"}
                  </td>
                )}

                {visible.leadSource && (
                  <td className="border px-2 py-1">
                    {job.source?.name || "—"}
                  </td>
                )}

                {visible.canceledReason && (
                  <td className="border px-2 py-1 whitespace-pre-line text-red-700">
                    {job.canceledReason || "—"}
                  </td>
                )}

                {visible.description && (
                  <td className="border px-2 py-1 whitespace-pre-line">
                    {job.description || "—"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}