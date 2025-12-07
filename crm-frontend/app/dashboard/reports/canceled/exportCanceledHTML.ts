export function exportCanceledHTML(rows: any[]) {
  if (!rows?.length) {
    alert("No canceled jobs to export");
    return;
  }

  const title = "Canceled Jobs Report";

  // Build rows
  const bodyRows = rows
    .map((job) => {
      const date = job.createdAt
        ? new Date(job.createdAt).toLocaleDateString()
        : "";

      const phones =
        (job.customerPhone || "") +
        (job.customerPhone2 ? "<br>" + job.customerPhone2 : "");

      return `
        <tr>
          <td>${date}</td>
          <td>${job.shortId || ""}</td>
          <td>${job.customerName || ""}</td>
          <td>${phones}</td>
          <td>${job.customerAddress || ""}</td>
          <td>${job.technician?.name || "—"}</td>
          <td>${job.source?.name || "—"}</td>
          <td>${job.canceledReason || "—"}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>

<style>
  body { font-family: Arial, sans-serif; padding: 20px; }
  h1 { text-align: center; margin-bottom: 20px; }

  table { width: 100%; border-collapse: collapse; }
  th, td {
    border: 1px solid #000;
    padding: 6px 8px;
    font-size: 14px;
  }
  th {
    background: #f2f2f2;
    font-weight: bold;
  }
  tr:nth-child(even) {
    background: #fafafa;
  }
</style>

</head>
<body>

<h1>${title}</h1>

<table>
  <thead>
    <tr>
      <th>Date</th>
      <th>Job ID</th>
      <th>Customer</th>
      <th>Phones</th>
      <th>Address</th>
      <th>Technician</th>
      <th>Lead Source</th>
      <th>Cancel Reason</th>
    </tr>
  </thead>

  <tbody>
    ${bodyRows}
  </tbody>
</table>

</body>
</html>
`;

  // Download file
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  const today = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `canceled-jobs-${today}.html`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}