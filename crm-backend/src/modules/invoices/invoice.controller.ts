import { Request, Response } from "express";
import prisma from "../../prisma/client";

/* Convert a UI money value → number | null (Prisma accepts number for Decimal). */
function money(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* Highest existing "-N" suffix for this job's shortId, +1.
   Using max-suffix (not count) so deleting an invoice never causes a clash. */
async function nextNumber(companyId: string, shortId: string): Promise<string> {
  const rows = await prisma.invoice.findMany({
    where: { companyId, shortId },
    select: { number: true },
  });
  let max = 0;
  for (const r of rows) {
    const m = /-(\d+)$/.exec(r.number || "");
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${shortId}-${max + 1}`;
}

/* Build the printed header, preferring the lead source's invoice identity and
   falling back to the company for any blank field. */
async function buildHeader(companyId: string, leadSourceId?: string | null) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });
  let ls: any = null;
  if (leadSourceId) {
    ls = await prisma.leadSource.findFirst({
      where: { id: leadSourceId, companyId },
    });
  }
  return {
    hdrCompanyName:
      (ls?.invoiceCompanyName || ls?.name || company?.name) ?? null,
    hdrPhone: (ls?.invoicePhone || company?.phone) ?? null,
    hdrAddress: (ls?.invoiceAddress || company?.address) ?? null,
    hdrCityStateZip: ls?.invoiceCityStateZip ?? null,
    hdrLogoUrl: (ls?.invoiceLogoUrl || company?.logoUrl) ?? null,
    hdrLicense: ls?.invoiceLicense ?? null,
  };
}

/* ============================================================
   CREATE INVOICE
============================================================ */
export async function createInvoice(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const b = req.body || {};

    // Resolve the job (for shortId + numbering).
    let job: any = null;
    if (b.jobId) {
      job = await prisma.job.findFirst({
        where: { id: b.jobId, companyId },
        select: { id: true, shortId: true, sourceId: true },
      });
      if (!job) return res.status(404).json({ error: "Job not found" });
    }

    const shortId: string | null = job?.shortId || b.shortId || null;
    if (!shortId) {
      return res
        .status(400)
        .json({ error: "A job (shortId) is required to number the invoice." });
    }

    const leadSourceId = b.leadSourceId ?? job?.sourceId ?? null;
    const header = await buildHeader(companyId, leadSourceId);
    const number = await nextNumber(companyId, shortId);

    const invoice = await prisma.invoice.create({
      data: {
        companyId,
        jobId: job?.id ?? null,
        leadSourceId,
        number,
        shortId,

        customerName: b.customerName ?? null,
        customerAddress: b.customerAddress ?? null,
        location: b.location ?? null,
        resPhone: b.resPhone ?? null,
        busPhone: b.busPhone ?? null,
        invoiceDate: b.invoiceDate ? new Date(b.invoiceDate) : new Date(),

        lineItems: Array.isArray(b.lineItems) ? b.lineItems : [],

        totalMaterials: money(b.totalMaterials),
        totalLabor: money(b.totalLabor),
        serviceCharge: money(b.serviceCharge),
        tripCharge: money(b.tripCharge),
        subtotal: money(b.subtotal),
        tax: money(b.tax),
        total: money(b.total),
        serviceChargeOn: Boolean(b.serviceChargeOn),
        tripChargeOn: Boolean(b.tripChargeOn),

        size: b.size === "receipt" ? "receipt" : "a4",
        notes: b.notes ?? null,
        showAuth: b.showAuth === undefined ? true : Boolean(b.showAuth),
        showTerms: b.showTerms === undefined ? true : Boolean(b.showTerms),

        ...header,
        createdById: req.user!.id ?? null,
      },
    });

    return res.json(invoice);
  } catch (err) {
    console.error("createInvoice error:", err);
    return res.status(500).json({ error: "Failed to create invoice" });
  }
}

/* ============================================================
   GET INVOICE BY ID
============================================================ */
export async function getInvoice(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    return res.json(invoice);
  } catch (err) {
    console.error("getInvoice error:", err);
    return res.status(500).json({ error: "Failed to load invoice" });
  }
}

/* ============================================================
   LIST INVOICES (optionally by job)
============================================================ */
export async function listInvoices(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const jobId = (req.query.jobId as string) || undefined;
    const invoices = await prisma.invoice.findMany({
      where: { companyId, ...(jobId ? { jobId } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return res.json(invoices);
  } catch (err) {
    console.error("listInvoices error:", err);
    return res.status(500).json({ error: "Failed to load invoices" });
  }
}

/* ============================================================
   UPDATE INVOICE (edit a saved invoice — number/header stay fixed)
============================================================ */
export async function updateInvoice(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!existing) return res.status(404).json({ error: "Invoice not found" });

    const b = req.body || {};
    const data: any = {};

    if (b.customerName !== undefined) data.customerName = b.customerName;
    if (b.customerAddress !== undefined) data.customerAddress = b.customerAddress;
    if (b.location !== undefined) data.location = b.location;
    if (b.resPhone !== undefined) data.resPhone = b.resPhone;
    if (b.busPhone !== undefined) data.busPhone = b.busPhone;
    if (b.invoiceDate !== undefined)
      data.invoiceDate = b.invoiceDate ? new Date(b.invoiceDate) : null;
    if (b.lineItems !== undefined)
      data.lineItems = Array.isArray(b.lineItems) ? b.lineItems : [];
    if (b.totalMaterials !== undefined) data.totalMaterials = money(b.totalMaterials);
    if (b.totalLabor !== undefined) data.totalLabor = money(b.totalLabor);
    if (b.serviceCharge !== undefined) data.serviceCharge = money(b.serviceCharge);
    if (b.tripCharge !== undefined) data.tripCharge = money(b.tripCharge);
    if (b.subtotal !== undefined) data.subtotal = money(b.subtotal);
    if (b.tax !== undefined) data.tax = money(b.tax);
    if (b.total !== undefined) data.total = money(b.total);
    if (b.serviceChargeOn !== undefined) data.serviceChargeOn = Boolean(b.serviceChargeOn);
    if (b.tripChargeOn !== undefined) data.tripChargeOn = Boolean(b.tripChargeOn);
    if (b.size !== undefined) data.size = b.size === "receipt" ? "receipt" : "a4";
    if (b.notes !== undefined) data.notes = b.notes;
    if (b.showAuth !== undefined) data.showAuth = Boolean(b.showAuth);
    if (b.showTerms !== undefined) data.showTerms = Boolean(b.showTerms);

    const invoice = await prisma.invoice.update({
      where: { id: existing.id },
      data,
    });
    return res.json(invoice);
  } catch (err) {
    console.error("updateInvoice error:", err);
    return res.status(500).json({ error: "Failed to update invoice" });
  }
}

/* ============================================================
   DELETE INVOICE
============================================================ */
export async function deleteInvoice(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const existing = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId },
    });
    if (!existing) return res.status(404).json({ error: "Invoice not found" });
    await prisma.invoice.delete({ where: { id: existing.id } });
    return res.json({ message: "Invoice deleted" });
  } catch (err) {
    console.error("deleteInvoice error:", err);
    return res.status(500).json({ error: "Failed to delete invoice" });
  }
}
