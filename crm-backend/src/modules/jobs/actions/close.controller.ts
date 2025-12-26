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

    // ❌ Technicians cannot finalize (only pending close)
    if (req.user?.role === "technician") {
      return res.status(403).json({
        error: "Technicians cannot finalize closing. Use Pending Close.",
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

    // Find CLOSED status row
    const closedStatus = await prisma.jobStatus.findFirst({
      where: { name: "Closed", active: true },
    });
    if (!closedStatus)
      return res.status(400).json({ error: "Closed status not found" });

    const result = await prisma.$transaction(async (tx: any) => {
      // ❗ Always force status to CLOSED (Fix #1)
      const newStatusId = closedStatus.id;

      // Mark job as fully closed
      const updatedJob = await tx.job.update({
        where: { id: job.id },
        data: {
          isClosingLocked: true,
          closedAt: closedAtDate,
          statusId: newStatusId,
        },
      });

      // ❗ Fix #3 — if any leftover closing data exists but status ≠ Closed, clear it
      if (updatedJob.statusId !== closedStatus.id) {
        await tx.jobClosing.deleteMany({ where: { jobId: job.id } });
      }

      // Create/update closing row
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
          closedAt: closedAtDate,
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
          closedAt: closedAtDate,
          closedByUserId: user.id,
        },
      });

      return { job: updatedJob, closing };
    });

    await logJobEvent({
  jobId: job.id,
  type: "closed",
  text: "Job closed",
  userId: user.id,
});

    return res.json(result);
  } catch (err) {
    console.error("closeJob error:", err);
    return res.status(500).json({ error: "Failed to close job" });
  }
}