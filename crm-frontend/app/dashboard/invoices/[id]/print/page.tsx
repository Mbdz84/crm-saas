"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const fmt = (v: any) => `$${num(v).toFixed(2)}`;

/* Format a US phone as (123) 123-1234. Leaves anything that isn't a
   10-digit (or 1+10) number untouched. */
const phone = (v: any) => {
  if (!v) return "";
  let d = String(v).replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  if (d.length !== 10) return String(v);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

export default function InvoicePrintPage() {
  const { id } = useParams() as { id: string };
  const base = process.env.NEXT_PUBLIC_API_URL;
  const [inv, setInv] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${base}/invoices/${id}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json())?.error || "Not found");
        return r.json();
      })
      .then(setInv)
      .catch((e) => setErr(e.message));
  }, [base, id]);

  const size: "a4" | "receipt" = inv?.size === "receipt" ? "receipt" : "a4";


  const exportHtml = () => {
    const el = sheetRef.current;
    if (!el) return;
    const styles = document.getElementById("inv-styles")?.innerHTML || "";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${
      inv?.number || ""
    }</title><style>${styles}body{margin:0;padding:16px;background:#fff}</style></head><body>${el.outerHTML}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Invoice-${inv?.number || id}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (err) return <div className="p-6 text-red-600">Error: {err}</div>;
  if (!inv) return <div className="p-6">Loading…</div>;

  const items: any[] = Array.isArray(inv.lineItems) ? inv.lineItems : [];
  const rows = size === "receipt" ? 8 : 12;
  const filler = Math.max(0, rows - items.length);

  return (
    <>
      <style id="inv-styles">{CSS}</style>
      {/* dynamic @page for the chosen size */}
      <style>{`@media print { @page { size: ${
        size === "receipt" ? "5.5in 8in" : "A4"
      }; margin: 0; } .no-print { display: none !important; } body { background:#fff; } }`}</style>

      <div className="no-print toolbar">
        <button onClick={() => window.print()}>🖨 Print / Save as PDF</button>
        <button onClick={exportHtml}>⬇ Export HTML</button>
        <span className="sizetag">{size === "receipt" ? "5.5×8″" : "A4"}</span>
      </div>

      <div className={`sheet ${size}`} ref={sheetRef}>
        {/* HEADER */}
        <div className="hdr">
          <div className="hdr-left">
            {inv.hdrLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="logo" src={inv.hdrLogoUrl} alt="logo" />
            ) : null}
            <div className="co">
              <div className="co-name">{inv.hdrCompanyName || ""}</div>
              {inv.hdrAddress ? <div>{inv.hdrAddress}</div> : null}
              {inv.hdrCityStateZip ? <div>{inv.hdrCityStateZip}</div> : null}
              {inv.hdrPhone ? <div>{phone(inv.hdrPhone)}</div> : null}
            </div>
          </div>
          <div className="hdr-right">
            <div className="title">INVOICE</div>
            <div className="no">No. {inv.number}</div>
          </div>
        </div>

        {/* CUSTOMER */}
        <div className="cust">
          <div className="cust-col">
            <div className="c-name">{inv.customerName || ""}</div>
            {inv.customerAddress ? <div className="c-line">{inv.customerAddress}</div> : null}
            {inv.location ? <div className="c-line">{inv.location}</div> : null}
          </div>
          <div className="cust-col right">
            <div className="c-line">
              <span className="k">Date</span>
              <span className="v">
                {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : ""}
              </span>
            </div>
            {inv.resPhone ? (
              <div className="c-line">
                <span className="k">Phone</span>
                <span className="v">{phone(inv.resPhone)}</span>
              </div>
            ) : null}
            {inv.busPhone ? (
              <div className="c-line">
                <span className="k">Phone</span>
                <span className="v">{phone(inv.busPhone)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* ITEMS */}
        <table className="items">
          <thead>
            <tr>
              <th className="c-qty">QUANTITY</th>
              <th className="c-desc">DESCRIPTION</th>
              <th className="c-price">PRICE</th>
              <th className="c-amt">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td className="c-qty">{it.qty ?? ""}</td>
                <td className="c-desc">{it.description ?? ""}</td>
                <td className="c-price">{it.price != null ? fmt(it.price) : ""}</td>
                <td className="c-amt">{it.amount != null ? fmt(it.amount) : ""}</td>
              </tr>
            ))}
            {Array.from({ length: filler }).map((_, i) => (
              <tr key={`f${i}`}>
                <td className="c-qty">&nbsp;</td>
                <td className="c-desc"></td>
                <td className="c-price"></td>
                <td className="c-amt"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALS */}
        <table className="totals">
          <tbody>
            <tr><td className="t-lbl">SUBTOTAL</td><td className="t-val">{inv.subtotal != null ? fmt(inv.subtotal) : ""}</td></tr>
            <tr><td className="t-lbl">TAX</td><td className="t-val">{inv.tax != null ? fmt(inv.tax) : ""}</td></tr>
            <tr className="grand"><td className="t-lbl">TOTAL</td><td className="t-val">{inv.total != null ? fmt(inv.total) : ""}</td></tr>
          </tbody>
        </table>

        {/* THANK YOU */}
        <div className="thankyou">We appreciate your business!</div>

        {/* AUTHORIZATION / TERMS */}
        {(inv.showAuth !== false || inv.showTerms !== false || inv.notes) ? (
          <div className="auth">
            {inv.showAuth !== false ? (
              <>
                <div className="auth-title">
                  AUTHORIZATION FOR SECURITY/EMERGENCY SERVICES
                </div>
                <div className="auth-body">
                  I hereby certify that I have the authority to order the lock,
                  key or security work designated above. Further, I agree to
                  absolve the locksmith who bears this authorization from any and
                  all claims arising from the performance of such work.
                </div>
              </>
            ) : null}
            {inv.showTerms !== false ? (
              <div
                className="auth-body"
                style={{
                  marginTop: inv.showAuth !== false ? 6 : 0,
                  fontWeight: 600,
                }}
              >
                All sales are final. Keys made, locks and hardware installed,
                parts supplied, and labor performed are custom services provided
                at the customer&apos;s request and are non-refundable once
                completed. Prices listed above are final.
              </div>
            ) : null}
            {inv.showAuth !== false ? (
              <div className="sig">
                <div>SIGNATURE X ______________________________</div>
                <div>DATE ______________</div>
              </div>
            ) : null}
            {inv.notes ? <div className="notes">{inv.notes}</div> : null}
          </div>
        ) : null}

        {/* FOOTER */}
        <div className="footer">
          <div className="foot-left">
            {inv.hdrLicense ? `License # ${inv.hdrLicense}` : ""}
          </div>
          <div className="foot-right">
            <div className="foot-brand">Digital Invoice</div>
            <div className="foot-page">Page 1 / 1</div>
          </div>
        </div>
      </div>
    </>
  );
}

const CSS = `
.toolbar{position:sticky;top:0;display:flex;gap:8px;align-items:center;padding:10px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;z-index:10}
.toolbar button{padding:6px 12px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font-size:13px}
.toolbar button:hover{background:#eef2ff}
.toolbar .sizetag{margin-left:auto;font-size:12px;color:#64748b}
.sheet{background:#fff;color:#1a1a1a;margin:16px auto;padding:14mm 12mm;box-shadow:0 1px 6px rgba(0,0,0,.15);box-sizing:border-box;font-family:Arial,Helvetica,sans-serif}
.sheet.a4{width:210mm;min-height:297mm;font-size:12px}
.sheet.receipt{width:5.5in;min-height:8in;padding:0.4in 0.45in;font-size:10px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:14px;border-bottom:2px solid #1a1a1a}
.hdr-left{display:flex;gap:14px;align-items:flex-start}
.logo{height:70px;width:auto;object-fit:contain}
.co-name{font-weight:bold;font-size:1.7em;margin-bottom:3px}
.co div{line-height:1.35;color:#333;font-size:1.12em}
.hdr-right{text-align:right}
.title{font-size:2em;font-weight:bold;line-height:1.05;letter-spacing:1px}
.no{margin-top:10px;font-size:1.2em;color:#555}
table{width:100%;border-collapse:collapse}

/* Customer block */
.cust{display:flex;justify-content:space-between;gap:16px;border:1px solid #d0d0d0;border-radius:6px;padding:12px 14px;margin-bottom:14px}
.cust-col{display:flex;flex-direction:column;gap:3px}
.cust-col.right{min-width:200px}
.cust-col.right .c-line{display:flex;justify-content:space-between;align-items:baseline;gap:16px}
.cust-col.right .v{color:#1a1a1a}
.cust .c-name{font-weight:bold;font-size:1.3em;color:#1a1a1a}
.cust .c-line{font-size:1.12em;color:#1a1a1a}
.cust .k{font-size:.72em;text-transform:uppercase;letter-spacing:.4px;color:#999;font-weight:600}

/* Items */
.items{margin-top:4px}
.items th{background:#f4f4f5;color:#333;padding:7px 8px;text-align:left;font-size:.85em;text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid #bbb}
.items th.c-qty,.items td.c-qty{width:80px;text-align:center}
.items th.c-price,.items td.c-price{width:90px;text-align:right}
.items th.c-amt,.items td.c-amt{width:100px;text-align:right}
.items td{border-bottom:1px solid #e5e5e5;padding:7px 8px;height:20px}

/* Totals */
.totals{margin-top:12px;width:52%;margin-left:auto}
.totals td{padding:5px 8px;border-bottom:1px solid #eee}
.totals .t-lbl{font-weight:600;color:#555;font-size:.85em;text-transform:uppercase;letter-spacing:.3px}
.totals .t-val{text-align:right;width:110px}
.totals .grand td{border-top:2px solid #1a1a1a;border-bottom:none;padding-top:8px}
.totals .grand .t-lbl,.totals .grand .t-val{font-size:1.2em;font-weight:bold;color:#1a1a1a}
.thankyou{text-align:center;margin:16px 0 4px;font-style:italic;font-size:1.05em;color:#444;letter-spacing:.3px}

/* Authorization */
.auth{margin-top:16px;border:1px solid #d0d0d0;border-radius:6px;padding:10px 12px}
.auth-title{text-align:center;font-weight:bold;font-size:.85em;letter-spacing:.3px;margin-bottom:5px}
.auth-body{font-size:.82em;line-height:1.4;color:#333}
.sig{display:flex;justify-content:space-between;margin-top:16px;font-size:.85em;color:#555}
.notes{margin-top:8px;font-size:.82em;white-space:pre-wrap;color:#333}
.footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:16px;padding-top:8px;border-top:1px solid #ddd}
.foot-left{font-size:.9em;color:#555;font-weight:600}
.foot-right{text-align:right}
.foot-brand{font-weight:bold;font-size:1em;color:#1a1a1a}
.foot-page{font-size:.82em;color:#888}

/* Print ONLY the invoice sheet — hide the dashboard chrome (topbar, sidebar,
   toolbar) and un-clip the fixed-height shell so the whole sheet prints. */
@media print {
  html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
  body * { visibility: hidden !important; overflow: visible !important; }
  .sheet, .sheet * { visibility: visible !important; }
  .sheet {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
  }
  .no-print { display: none !important; }
}
`;
