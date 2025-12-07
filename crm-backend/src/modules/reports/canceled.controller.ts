import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { startOfDay, endOfDay, parseISO } from "date-fns";

const CANCELLED_STATUSES = ["Canceled", "Cancelled", "Cancel"];

export async function getCanceledJobs(req: Request, res: Response) {
  try {
    const { from, to, tech, source } = req.query;

    const companyId = req.user?.companyId || null;

    // Date filter
    const dateFilter: any = {};
    if (from) dateFilter.gte = startOfDay(parseISO(from as string));
    if (to) dateFilter.lte = endOfDay(parseISO(to as string));

    const where: any = {
      ...(companyId && { companyId }),
      jobStatus: {
        name: { in: CANCELLED_STATUSES },
      },
    };

    if (from || to) where.createdAt = dateFilter;
    if (tech) where.technicianId = tech as string;
    if (source) where.sourceId = source as string;

    // Fetch jobs (including cancel reason)
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
        canceledAt: true,

        technician: { select: { name: true } },
        source: { select: { name: true } },
        jobStatus: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // -------- Technician Summary --------
    const techSummary: Record<
      string,
      { name: string; total: number; closed: number; cancelled: number }
    > = {};

    jobs.forEach((job: any) => {
      const techName = job.technician?.name || "Unassigned";

      if (!techSummary[techName]) {
        techSummary[techName] = {
          name: techName,
          total: 0,
          closed: 0,
          cancelled: 0,
        };
      }

      techSummary[techName].total += 1;
      techSummary[techName].cancelled += 1;
    });

    const technicianSummary = Object.values(techSummary);

    // -------- Lead Source Summary --------
    const leadSourceMap: Record<
      string,
      { name: string; total: number; closed: number; cancelled: number }
    > = {};

    jobs.forEach((job: any) => {
      const sourceName = job.source?.name || "Unknown Source";

      if (!leadSourceMap[sourceName]) {
        leadSourceMap[sourceName] = {
          name: sourceName,
          total: 0,
          closed: 0,
          cancelled: 0,
        };
      }

      leadSourceMap[sourceName].total += 1;
      leadSourceMap[sourceName].cancelled += 1;
    });

    const leadSourceSummary = Object.values(leadSourceMap);

    return res.json({
      summary: {
        count: jobs.length,
      },
      jobs,
      technicianSummary,
      leadSourceSummary,
    });
  } catch (err) {
    console.error("🔥 CANCELED REPORT ERROR:", err);
    return res.status(500).json({ error: "Failed to load canceled jobs" });
  }
}