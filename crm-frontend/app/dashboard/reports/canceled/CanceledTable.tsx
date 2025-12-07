export default function CanceledTable({
  rows,
  visible,
}: {
  rows: any[];
  visible: Record<string, boolean>;
}) {
  if (!rows?.length)
    return (
      <p className="text-gray-500 text-sm mt-4">No canceled jobs found.</p>
    );

  return (
    <div className="overflow-auto border rounded mt-6">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
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
          {rows.map((job) => (
            <tr key={job.id} className="hover:bg-gray-50">
              {visible.date && (
                <td className="border px-2 py-1">
                  {new Date(job.createdAt).toLocaleDateString()}
                </td>
              )}

              {visible.jobId && (
                <td className="border px-2 py-1">{job.shortId}</td>
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
                <td className="border px-2 py-1">{job.customerAddress}</td>
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
                <td className="border px-2 py-1 whitespace-pre-line">
                  {job.canceledReason || "—"}
                </td>
              )}

              {visible.description && (
                <td className="border px-2 py-1 whitespace-pre-line">
                  {job.description || "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}