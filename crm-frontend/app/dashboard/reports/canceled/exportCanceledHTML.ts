export function exportCanceledHTML(rows: any[]) {
  if (!rows?.length) {
    alert("No canceled jobs to export");
    return;
  }

  const title = "Canceled Jobs Report";

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
  body {
    font-family: Arial, sans-serif;
    padding: 20px;
  }

  h1 {
    text-align: center;
    margin-bottom: 20px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  th, td {
    border: 1px solid #000;
    padding: 6px 8px;
    font-size: 13px;
    vertical-align: top;
    word-wrap: break-word;
  }

  th {
    background: #f2f2f2;
    font-weight: bold;
    text-align: left;
  }

  tr:nth-child(even) {
    background: #fafafa;
  }

  /* Column widths aligned with UI */
  th:nth-child(1), td:nth-child(1) { width: 90px; }   /* Date */
  th:nth-child(2), td:nth-child(2) { width: 80px; }   /* Job ID */
  th:nth-child(3), td:nth-child(3) { width: 140px; }  /* Customer */
  th:nth-child(4), td:nth-child(4) { width: 120px; }  /* Phones */
  th:nth-child(5), td:nth-child(5) { width: 260px; }  /* Address */
  th:nth-child(6), td:nth-child(6) { width: 140px; }  /* Technician */
  th:nth-child(7), td:nth-child(7) { width: 140px; }  /* Lead Source */
  th:nth-child(8), td:nth-child(8) { width: 180px; }  /* Cancel Reason */
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