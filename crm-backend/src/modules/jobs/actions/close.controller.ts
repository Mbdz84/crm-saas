import { Request, Response } from "express";
import prisma from "../../../prisma/client";
import { calcPaymentTotals } from "../utils/payments";
import { logJobEvent } from "../../../utils/jobLogger";


export async function closeJob(req: Request, res: Response) {
  try {
    const { shortId } = req.params;

    const job = await prisma.job.findUnique({
      where: { shortId },
      include: { company: true },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });

    const user = req.user;
    if (!user || user.companyId !== job.companyId)
      return res.status(403).json({ error: "Forbidden" });

    // Technicians submit a PENDING close (saved but editable, not finalized);
    // admins finalize to Closed. The same closing data is saved either way.
    const isTech =
      req.user?.role === "technician" || req.user?.role === "dispatcher";

    // Once a job is finalized (locked), a technician can no longer edit the
    // closing — only an admin can. While it's pending it stays editable.
    if (isTech && job.isClosingLocked) {
      return res.status(403).json({
        error: "This job is already closed — only an admin can change the closing.",
      });
    }

    // ❌ Prevent closing canceled jobs
    if (
      job.status?.toLowerCase() === "canceled" ||
      job.status?.toLowerCase() === "cancelled"
    ) {
      return res.status(400).json({ error: "Cannot close a canceled job" });
    }

    const body = req.body || {};
    const {
      invoiceNumber,
      payments,
      totalAmount,
      totalCcFee,
      techParts,
      leadParts,
      companyParts,
      totalParts,
      adjustedTotal,
      techPercent,
      leadPercent,
      companyPercent,
      excludeTechFromParts,
      techPaysAdditionalFee,
      leadAdditionalFee,
      leadOwnedByCompany,
      techProfit,
      leadProfit,
      companyProfitBase,
      companyProfitDisplay,
      techBalance,
      leadBalance,
      companyBalance,
      sumCheck,
      closedAt: closedAtRaw,
    } = body;

    const closedAtDate = closedAtRaw ? new Date(closedAtRaw) : new Date();

    const { cashTotal, creditTotal, checkTotal, zelleTotal } =
      calcPaymentTotals(payments);

    // Tech → "Pending Close" (editable). Admin → "Closed" (final).
    const targetName = isTech ? "Pending Close" : "Closed";
    const targetStatus = await prisma.jobStatus.findFirst({
      where: { name: targetName, active: true },
    });
    if (!targetStatus)
      return res.status(400).json({ error: `${targetName} status not found` });

    const result = await prisma.$transaction(async (tx: any) => {
      const newStatusId = targetStatus.id;

      // Admin close locks + stamps closedAt. Pending (tech) stays editable
      // and is not stamped closed until an admin finalizes.
      const updatedJob = await tx.job.update({
        where: { id: job.id },
        data: {
          isClosingLocked: !isTech,
          closedAt: isTech ? null : closedAtDate,
          statusId: newStatusId,

          // Persist any job-field edits made while the closing panel was open
          // (e.g. reassigned technician). Only overwrite when the client sends
          // the field, and never wipe with an empty value unintentionally.
          technicianId:
            body.technicianId !== undefined
              ? body.technicianId || null
              : job.technicianId,
          scheduledAt:
            body.scheduledAt !== undefined
              ? body.scheduledAt
                ? new Date(body.scheduledAt)
                : null
              : job.scheduledAt,
          jobTypeId:
            body.jobTypeId !== undefined
              ? body.jobTypeId || null
              : job.jobTypeId,
          sourceId:
            body.sourceId !== undefined ? body.sourceId || null : job.sourceId,
          title: body.title ?? job.title,
          description: body.description ?? job.description,
          customerName: body.customerName ?? job.customerName,
          customerPhone: body.customerPhone ?? job.customerPhone,
          customerPhone2:
            body.customerPhone2 !== undefined
              ? body.customerPhone2 || null
              : job.customerPhone2,
          customerAddress: body.customerAddress ?? job.customerAddress,
          timezone: body.timezone ?? job.timezone,
        },
      });

      // Only a FINAL close frees the extension; a pending close keeps the job
      // reachable while it's still open.
      if (!isTech) {
        await tx.jobCallSession.updateMany({
          where: { jobId: job.id, active: true },
          data: { active: false, lastCallerPhone: null },
        });
      }

      // Create/update closing row (kept for both pending and final)
      const closing = await tx.jobClosing.upsert({
        where: { jobId: job.id },
        update: {
          invoiceNumber: invoiceNumber || null,
          payments: Array.isArray(payments) ? payments : [],
          totalAmount: Number(totalAmount) || 0,
          totalCcFee: Number(totalCcFee) || 0,
          techParts: Number(techParts) || 0,
          leadParts: Number(leadParts) || 0,
          companyParts: Number(companyParts) || 0,
          totalParts: Number(totalParts) || 0,
          adjustedTotal: Number(adjustedTotal) || 0,
          techPercent: Number(techPercent) || 0,
          leadPercent: Number(leadPercent) || 0,
          companyPercent: Number(companyPercent) || 0,
          excludeTechFromParts: !!excludeTechFromParts,
          techPaysAdditionalFee: !!techPaysAdditionalFee,
          leadAdditionalFee: Number(leadAdditionalFee) || 0,
          leadOwnedByCompany: !!leadOwnedByCompany,
          techProfit: Number(techProfit) || 0,
          leadProfit: Number(leadProfit) || 0,
          companyProfitBase: Number(companyProfitBase) || 0,
          companyProfitDisplay: Number(companyProfitDisplay) || 0,
          techBalance: Number(techBalance) || 0,
          leadBalance: Number(leadBalance) || 0,
          companyBalance: Number(companyBalance) || 0,
          sumCheck: Number(sumCheck) || 0,
          cashTotal,
          creditTotal,
          checkTotal,
          zelleTotal,
          closedAt: isTech ? null : closedAtDate,
          closedByUserId: user.id,
        },
        create: {
          jobId: job.id,
          invoiceNumber: invoiceNumber || null,
          payments: Array.isArray(payments) ? payments : [],
          totalAmount: Number(totalAmount) || 0,
          totalCcFee: Number(totalCcFee) || 0,
          techParts: Number(techParts) || 0,
          leadParts: Number(leadParts) || 0,
          companyParts: Number(companyParts) || 0,
          totalParts: Number(totalParts) || 0,
          adjustedTotal: Number(adjustedTotal) || 0,
          techPercent: Number(techPercent) || 0,
          leadPercent: Number(leadPercent) || 0,
          companyPercent: Number(companyPercent) || 0,
          excludeTechFromParts: !!excludeTechFromParts,
          techPaysAdditionalFee: !!techPaysAdditionalFee,
          leadAdditionalFee: Number(leadAdditionalFee) || 0,
          leadOwnedByCompany: !!leadOwnedByCompany,
          techProfit: Number(techProfit) || 0,
          leadProfit: Number(leadProfit) || 0,
          companyProfitBase: Number(companyProfitBase) || 0,
          companyProfitDisplay: Number(companyProfitDisplay) || 0,
          techBalance: Number(techBalance) || 0,
          leadBalance: Number(leadBalance) || 0,
          companyBalance: Number(companyBalance) || 0,
          sumCheck: Number(sumCheck) || 0,
          cashTotal,
          creditTotal,
          checkTotal,
          zelleTotal,
          closedAt: isTech ? null : closedAtDate,
          closedByUserId: user.id,
        },
      });

      return { job: updatedJob, closing };
    });

    // Build a closing summary for the log (mirrors the closing panel:
    // per-party dollars = percent × totalAmount, plus collected-by-method).
    const num = (v: any) => Number(v) || 0;
    const money = (v: number) => `$${v.toFixed(2)}`;
    const totalForSplit = num(totalAmount);
    const share = (pct: any) => (num(pct) / 100) * totalForSplit;

    const collected = cashTotal + creditTotal + checkTotal + zelleTotal;
    const methodParts = [
      cashTotal ? `Cash ${money(cashTotal)}` : null,
      creditTotal ? `Credit ${money(creditTotal)}` : null,
      checkTotal ? `Check ${money(checkTotal)}` : null,
      zelleTotal ? `Zelle ${money(zelleTotal)}` : null,
    ].filter(Boolean);

    const closeText = [
      isTech ? "Pending Close submitted by technician" : "Job closed",
      `Collected: ${money(collected)}${
        methodParts.length ? ` (${methodParts.join(", ")})` : ""
      }`,
      `Tech ${num(techPercent)}% — ${money(share(techPercent))}`,
      `Lead ${num(leadPercent)}% — ${money(share(leadPercent))}`,
      `Company ${num(companyPercent)}% — ${money(share(companyPercent))}`,
    ].join("\n");

    await logJobEvent({
      jobId: job.id,
      type: isTech ? "updated" : "closed",
      text: closeText,
      userId: user.id,
    });

    return res.json(result);
  } catch (err) {
    console.error("closeJob error:", err);
    return res.status(500).json({ error: "Failed to close job" });
  }
}