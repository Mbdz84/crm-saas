import { Request, Response } from "express";
import prisma from "../../../prisma/client";
import { calcPaymentTotals } from "../utils/payments";

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
    } = body;

    // PAYMENT TOTALS
    const { cashTotal, creditTotal, checkTotal, zelleTotal } =
      calcPaymentTotals(payments);

    // CC AVG PERCENT
    let ccFeePercentAvg: number | null = null;
    if (Array.isArray(payments) && totalCcFee > 0) {
      const ccBase = payments
        .filter((p: any) => p.payment === "credit")
        .reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);

      if (ccBase > 0) {
        ccFeePercentAvg = (Number(totalCcFee) / ccBase) * 100;
      }
    }

    const closedStatus = await prisma.jobStatus.findFirst({
      where: { name: "Closed", active: true },
    });
    if (!closedStatus)
      return res.status(400).json({ error: "Closed status not found" });

    const result = await prisma.$transaction(async (tx: any) => {
      const newStatusId = req.body.statusId ?? job.statusId;
      const isFinalClose = newStatusId === closedStatus.id;

      const updatedJob = await tx.job.update({
        where: { id: job.id },
        data: {
          isClosingLocked: isFinalClose,
          closedAt: isFinalClose ? new Date() : null,
          statusId: newStatusId,
        },
      });

      const closing = await tx.jobClosing.upsert({
        where: { jobId: job.id },
        update: {
          invoiceNumber: invoiceNumber || null,
          payments: Array.isArray(payments) ? payments : [],
          totalAmount: Number(totalAmount) || 0,
          totalCcFee: Number(totalCcFee) || 0,
          ccFeePercentAvg,
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
          // NEW PAYMENT TOTALS
          cashTotal,
          creditTotal,
          checkTotal,
          zelleTotal,
          closedAt: isFinalClose ? new Date() : undefined,
          closedByUserId: user.id,
        },
        create: {
          jobId: job.id,
          invoiceNumber: invoiceNumber || null,
          payments: Array.isArray(payments) ? payments : [],
          totalAmount: Number(totalAmount) || 0,
          totalCcFee: Number(totalCcFee) || 0,
          ccFeePercentAvg,
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
          // NEW PAYMENT TOTALS
          cashTotal,
          creditTotal,
          checkTotal,
          zelleTotal,
          closedAt: isFinalClose ? new Date() : undefined,
          closedByUserId: user.id,
        },
      });

      return { job: updatedJob, closing };
    });

    return res.json(result);
  } catch (err) {
    console.error("closeJob error:", err);
    return res.status(500).json({ error: "Failed to close job" });
  }
}
