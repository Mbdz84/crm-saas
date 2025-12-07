export default function CanceledTable({ rows }: { rows: any[] }) {
  if (!rows?.length)
    return <p className="text-gray-500 text-sm mt-4">No canceled jobs found.</p>;

  return (
    <div className="overflow-auto border rounded mt-6">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Date</th>
            <th className="border px-2 py-1">Job ID</th>
            <th className="border px-2 py-1">Customer</th>
            <th className="border px-2 py-1">Phones</th>
            <th className="border px-2 py-1">Address</th>
            <th className="border px-2 py-1">Technician</th>
            <th className="border px-2 py-1">Lead Source</th>
            <th className="border px-2 py-1">Cancel Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(job => (
            <tr key={job.id} className="hover:bg-gray-50">
              <td className="border px-2 py-1">
                {new Date(job.createdAt).toLocaleDateString()}
              </td>
              <td className="border px-2 py-1">{job.shortId}</td>
              <td className="border px-2 py-1">{job.customerName}</td>
              <td className="border px-2 py-1 whitespace-pre-line">
                {(job.customerPhone || "") +
                  (job.customerPhone2 ? "\n" + job.customerPhone2 : "")}
              </td>
              <td className="border px-2 py-1">{job.customerAddress}</td>
              <td className="border px-2 py-1">{job.technician?.name || "—"}</td>
              <td className="border px-2 py-1">{job.source?.name || "—"}</td>
              <td className="border px-2 py-1 whitespace-pre-line">
                {job.canceledReason || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}