"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useJob } from "../state/JobProvider";
import GoogleAddressInput from "@/components/GoogleAddressInput";
import { Trash2 } from "lucide-react";

type Line = { qty: string; description: string; price: string };

/* Kept in sync with the printed invoice (invoices/[id]/print). */
const AUTH_TEXT =
  "AUTHORIZATION FOR SECURITY/EMERGENCY SERVICES — I hereby certify that I have the authority to order the lock, key or security work designated above. Further, I agree to absolve the locksmith who bears this authorization from any and all claims arising from the performance of such work.";
const TERMS_TEXT =
  "All sales are final. Keys made, locks and hardware installed, parts supplied, and labor performed are custom services provided at the customer's request and are non-refundable once completed. Prices listed above are final.";

const money = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n: number) => `$${n.toFixed(2)}`;

/* Split a full address string into street (line 1) + city/state/zip (line 2). */
function splitAddress(full?: string): { line1: string; cityStateZip: string } {
  if (!full) return { line1: "", cityStateZip: "" };
  const clean = full.replace(/,?\s*(USA|United States)\s*$/i, "").trim();
  const i = clean.indexOf(",");
  if (i === -1) return { line1: clean, cityStateZip: "" };
  return {
    line1: clean.slice(0, i).trim(),
    cityStateZip: clean.slice(i + 1).trim(),
  };
}

export default function InvoiceTab() {
  const { job, editableJob, leadSources, payments } = useJob() as any;
  const base = process.env.NEXT_PUBLIC_API_URL;

  const jobId: string | undefined = job?.id;
  const shortId: string | undefined = job?.shortId;
  const sourceId: string | null = editableJob?.sourceId ?? job?.sourceId ?? null;

  // ---- form state ----
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [location, setLocation] = useState("");
  const [resPhone, setResPhone] = useState("");
  const [busPhone, setBusPhone] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<string>("");
  const [leadSourceId, setLeadSourceId] = useState<string>("");
  const [size, setSize] = useState<"a4" | "receipt">("a4");

  const [lines, setLines] = useState<Line[]>([
    { qty: "1", description: "", price: "" },
  ]);

  const [tax, setTax] = useState("");
  const [taxPct, setTaxPct] = useState("");
  const [showAuth, setShowAuth] = useState(true);
  const [showTerms, setShowTerms] = useState(true);
  const [notes, setNotes] = useState("");

  const [presets, setPresets] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // ---- prefill from the job once it loads ----
  useEffect(() => {
    if (!job) return;
    setCustomerName(job.customerName ?? "");
    const a = splitAddress(job.customerAddress);
    setCustomerAddress(a.line1);
    setLocation(a.cityStateZip);
    setResPhone(job.customerPhone ?? "");
    setBusPhone(job.customerPhone2 ?? "");
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setLeadSourceId(sourceId ?? "");

    // Seed a first line from the job total (sum of payments), if any.
    const paid = Array.isArray(payments)
      ? payments.reduce((s: number, p: any) => s + money(p.amount), 0)
      : 0;
    if (paid > 0) {
      setLines([{ qty: "1", description: "Service", price: String(paid) }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

  // ---- load company presets + existing invoices ----
  useEffect(() => {
    fetch(`${base}/companies/me`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) =>
        setPresets(Array.isArray(d?.invoiceDescriptions) ? d.invoiceDescriptions : [])
      )
      .catch(() => {});
  }, [base]);

  const loadHistory = () => {
    if (!jobId) return;
    fetch(`${base}/invoices?jobId=${jobId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setHistory(Array.isArray(d) ? d : []))
      .catch(() => {});
  };
  useEffect(loadHistory, [base, jobId]);

  // ---- totals ----
  const itemsSubtotal = useMemo(
    () => lines.reduce((s, l) => s + money(l.qty) * money(l.price), 0),
    [lines]
  );
  const subtotal = itemsSubtotal;
  // Tax can be entered as a % of subtotal OR a flat $ amount. % wins if set.
  const taxAmount =
    taxPct !== "" ? (subtotal * money(taxPct)) / 100 : money(tax);
  const total = subtotal + taxAmount;

  // ---- line helpers ----
  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addBlank = () =>
    setLines((prev) => [...prev, { qty: "1", description: "", price: "" }]);
  const removeLine = (i: number) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  const addPreset = (desc: string) => {
    if (!desc) return;
    setLines((prev) => {
      // fill the first empty description, else append a new row
      const idx = prev.findIndex((l) => !l.description.trim());
      if (idx >= 0)
        return prev.map((l, i) => (i === idx ? { ...l, description: desc } : l));
      return [...prev, { qty: "1", description: desc, price: "" }];
    });
  };

  /* Load a previously saved invoice back into the form for editing/re-issuing. */
  const fillFromInvoice = (inv: any) => {
    setCustomerName(inv.customerName ?? "");
    setCustomerAddress(inv.customerAddress ?? "");
    setLocation(inv.location ?? "");
    setResPhone(inv.resPhone ?? "");
    setBusPhone(inv.busPhone ?? "");
    setInvoiceDate(
      inv.invoiceDate ? String(inv.invoiceDate).slice(0, 10) : invoiceDate
    );
    setLeadSourceId(inv.leadSourceId ?? "");
    setSize(inv.size === "receipt" ? "receipt" : "a4");
    setNotes(inv.notes ?? "");
    setShowAuth(inv.showAuth !== false);
    setShowTerms(inv.showTerms !== false);
    setTaxPct("");
    setTax(inv.tax != null ? String(inv.tax) : "");
    const items = Array.isArray(inv.lineItems) ? inv.lineItems : [];
    setLines(
      items.length
        ? items.map((it: any) => ({
            qty: it.qty != null ? String(it.qty) : "1",
            description: it.description ?? "",
            price: it.price != null ? String(it.price) : "",
          }))
        : [{ qty: "1", description: "", price: "" }]
    );
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    toast.success(`Loaded ${inv.number} into the form`);
  };

  const deleteInvoice = async (inv: any) => {
    if (!window.confirm(`Delete invoice ${inv.number}? This cannot be undone.`))
      return;
    try {
      const res = await fetch(`${base}/invoices/${inv.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast.success(`Deleted ${inv.number}`);
      setHistory((prev) => prev.filter((h) => h.id !== inv.id));
    } catch {
      toast.error("Failed to delete invoice");
    }
  };

  const generate = async () => {
    if (!shortId) return toast.error("Job not loaded yet");
    setSaving(true);
    try {
      const payload = {
        jobId,
        shortId,
        leadSourceId: leadSourceId || null,
        size,
        customerName,
        customerAddress,
        location,
        resPhone,
        busPhone,
        invoiceDate,
        lineItems: lines
          .filter((l) => l.description.trim() || money(l.price) > 0)
          .map((l) => ({
            qty: money(l.qty),
            description: l.description,
            price: money(l.price),
            amount: money(l.qty) * money(l.price),
          })),
        subtotal,
        tax: tax === "" && taxPct === "" ? null : taxAmount,
        total,
        notes,
        showAuth,
        showTerms,
      };

      const res = await fetch(`${base}/invoices`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");

      toast.success(`Invoice ${data.number} created`);
      loadHistory();
      window.open(`/dashboard/invoices/${data.id}/print`, "_blank");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create invoice");
    }
    setSaving(false);
  };

  const input = "border rounded p-2 text-sm w-full dark:bg-gray-800";
  const label = "text-xs font-semibold text-gray-600";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Invoice</h2>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className={label}>Brand</span>
            <select
              className="border rounded p-1.5 text-sm dark:bg-gray-800 max-w-[180px]"
              value={leadSourceId}
              onChange={(e) => setLeadSourceId(e.target.value)}
              title="Company details / logo come from this lead source's Invoice Profile"
            >
              <option value="">Company default</option>
              {(leadSources || []).map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.invoiceCompanyName || s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className={label}>Size</span>
            <select
              className="border rounded p-1.5 text-sm dark:bg-gray-800"
              value={size}
              onChange={(e) => setSize(e.target.value as "a4" | "receipt")}
            >
              <option value="a4">A4</option>
              <option value="receipt">Receipt 5.5×8&quot;</option>
            </select>
          </div>
        </div>
      </div>

      {/* CUSTOMER */}
      <div className="border rounded p-4 grid md:grid-cols-2 gap-3">
        <div>
          <label className={label}>Name</label>
          <input className={input} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </div>
        <div>
          <label className={label}>Date</label>
          <input type="date" className={input} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className={label}>Address</label>
          <GoogleAddressInput
            value={customerAddress}
            onChange={setCustomerAddress}
            onSelect={(p) => {
              setCustomerAddress(p.line1);
              setLocation(p.cityStateZip);
            }}
            placeholder="Start typing address…"
            className={input}
          />
        </div>
        <div className="md:col-span-2">
          <label className={label}>City, State, Zip</label>
          <input className={input} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Arlington Heights, IL 60004" />
        </div>
        <div>
          <label className={label}>Phone 1</label>
          <input className={input} value={resPhone} onChange={(e) => setResPhone(e.target.value)} />
        </div>
        <div>
          <label className={label}>Phone 2</label>
          <input className={input} value={busPhone} onChange={(e) => setBusPhone(e.target.value)} />
        </div>
      </div>

      {/* LINE ITEMS */}
      <div className="border rounded p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm">Line items</h3>
          <div className="flex items-center gap-2">
            <select
              className="border rounded p-1.5 text-xs dark:bg-gray-800"
              value=""
              onChange={(e) => {
                addPreset(e.target.value);
                e.currentTarget.value = "";
              }}
            >
              <option value="">+ Add preset…</option>
              {presets.map((p, i) => (
                <option key={i} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button onClick={addBlank} className="text-xs px-2 py-1 border rounded">
              + Blank row
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[70px_1fr_90px_90px_30px] gap-2 text-[11px] font-semibold text-gray-500 px-1">
          <div>QTY</div>
          <div>DESCRIPTION</div>
          <div>PRICE</div>
          <div>AMOUNT</div>
          <div></div>
        </div>

        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[70px_1fr_90px_90px_30px] gap-2 items-center">
            <input className={input} value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} />
            <input className={input} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Description" />
            <input className={input} value={l.price} onChange={(e) => setLine(i, { price: e.target.value })} placeholder="0.00" />
            <div className="text-sm font-mono text-right pr-1">
              {fmt(money(l.qty) * money(l.price))}
            </div>
            <button onClick={() => removeLine(i)} className="text-red-500 text-lg leading-none" title="Remove">
              ×
            </button>
          </div>
        ))}
      </div>

      {/* TOTALS */}
      <div className="border rounded p-4 grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className={label}>Notes</label>
            <textarea className={`${input} h-24`} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-2 border-t pt-3">
            <p className={label}>Bottom sections</p>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showAuth} onChange={(e) => setShowAuth(e.target.checked)} />
              Show authorization &amp; signature
            </label>
            {showAuth && (
              <p className="text-[11px] text-gray-500 italic bg-gray-50 dark:bg-gray-800 rounded p-2 ml-6">
                {AUTH_TEXT}
              </p>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showTerms} onChange={(e) => setShowTerms(e.target.checked)} />
              Show no-refund / final-sale terms
            </label>
            {showTerms && (
              <p className="text-[11px] text-gray-500 italic bg-gray-50 dark:bg-gray-800 rounded p-2 ml-6">
                {TERMS_TEXT}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between border-t pt-1"><span>Subtotal</span><span className="font-mono">{fmt(subtotal)}</span></div>

          <div className="flex justify-between items-center gap-2">
            <span>Tax (%)</span>
            <div className="flex items-center border rounded px-1 w-24 dark:bg-gray-800">
              <input
                className="p-1 text-sm w-full text-right bg-transparent outline-none"
                value={taxPct}
                onChange={(e) => { setTaxPct(e.target.value); if (e.target.value !== "") setTax(""); }}
                placeholder="0"
              />
              <span className="text-gray-400 pl-1">%</span>
            </div>
          </div>

          <div className="flex justify-between items-center gap-2">
            <span>Tax ($)</span>
            <div className="flex items-center border rounded px-1 w-24 dark:bg-gray-800">
              <span className="text-gray-400 pr-1">$</span>
              <input
                className="p-1 text-sm w-full text-right bg-transparent outline-none disabled:opacity-50"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                placeholder="0.00"
                disabled={taxPct !== ""}
              />
            </div>
          </div>

          {taxPct !== "" && (
            <div className="flex justify-between text-xs text-gray-500"><span>Tax amount</span><span className="font-mono">{fmt(taxAmount)}</span></div>
          )}

          <div className="flex justify-between border-t pt-1 text-base font-semibold"><span>Total</span><span className="font-mono">{fmt(total)}</span></div>
        </div>
      </div>

      <button
        onClick={generate}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded disabled:opacity-50"
      >
        {saving ? "Generating…" : "Generate Invoice"}
      </button>

      {/* HISTORY */}
      {history.length > 0 && (
        <div className="border rounded p-4">
          <h3 className="font-semibold text-sm mb-2">Invoices for this job</h3>
          <ul className="divide-y">
            {history.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="font-mono">{inv.number}</span>
                <span className="text-gray-500">
                  {inv.total != null ? fmt(money(inv.total)) : ""}
                </span>
                <div className="ml-auto flex items-center gap-3">
                  <button
                    onClick={() => fillFromInvoice(inv)}
                    className="text-blue-600 hover:underline"
                  >
                    Fill form
                  </button>
                  <a
                    href={`/dashboard/invoices/${inv.id}/print`}
                    target="_blank"
                    className="text-blue-600 hover:underline"
                  >
                    Open / Print
                  </a>
                  <button
                    onClick={() => deleteInvoice(inv)}
                    title="Delete invoice"
                    aria-label="Delete invoice"
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
