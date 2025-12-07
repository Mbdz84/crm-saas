import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { startOfDay, endOfDay, parseISO } from "date-fns";

const CANCELLED_STATUSES = ["Canceled", "Cancelled", "Cancel"];

export async function getCanceledJobs(req: Request, res: Response) {
  try {
    const { from, to } = req.query;

    const companyId = req.user?.companyId;

    const dateFilter: any = {};
    if (from) dateFilter.gte = startOfDay(parseISO(from as string));
    if (to) dateFilter.lte = endOfDay(parseISO(to as string));

    const where: any = {
      ...(companyId && { companyId }),
      jobStatus: { name: { in: CANCELLED_STATUSES } }
    };

    if (from || to) where.createdAt = dateFilter;

    const jobs = await prisma.job.findMany({
      where,
      select: {
        id: true,
        shortId: true,
        customerName: true,
        customerPhone: true,
        customerPhone2: true,
        customerAddress: true,
        createdAt: true,
        canceledReason: true,

        technician: { select: { name: true } },
        source: { select: { name: true } },
        jobStatus: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    // summary per tech
    const techSummaryMap: any = {};
    jobs.forEach(job => {
      const name = job.technician?.name || "Unassigned";
      if (!techSummaryMap[name]) techSummaryMap[name] = { name, total: 0, cancelled: 0 };
      techSummaryMap[name].total++;
      techSummaryMap[name].cancelled++;
    });

    const technicianSummary = Object.values(techSummaryMap);

    // summary per source
    const sourceMap: any = {};
    jobs.forEach(job => {
      const name = job.source?.name || "Unknown Source";
      if (!sourceMap[name]) sourceMap[name] = { name, total: 0, cancelled: 0 };
      sourceMap[name].total++;
      sourceMap[name].cancelled++;
    });

    const leadSourceSummary = Object.values(sourceMap);

    return res.json({
      summary: { count: jobs.length },
      jobs,
      technicianSummary,
      leadSourceSummary
    });

  } catch (err) {
    console.error("🔥 CANCEL REPORT ERROR:", err);
    return res.status(500).json({ error: "Failed to load canceled jobs" });
  }
}