import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { ownJobsWhere, reportsBlocked, limitReportToTech } from "../../utils/scope";

const CANCELLED_STATUSES = ["Canceled", "Cancelled", "Cancel"];
const DEFAULT_TZ = "America/Chicago";

export async function getCanceledJobs(req: Request, res: Response) {
  try {
    if (await reportsBlocked(req)) {
      return res.status(403).json({ error: "Reports access disabled" });
    }
    const { from, to, tech, source } = req.query;

    const companyId = req.user?.companyId || null;

    const fromStr = typeof from === "string" && from ? from : undefined;
    const toStr = typeof to === "string" && to ? to : undefined;

    // Widened UTC window; exact day membership is decided per job below
    // using each job's own timezone (judged by cancel date).
    const widened: any = {};
    if (fromStr)
      widened.gte = new Date(
        new Date(`${fromStr}T00:00:00.000Z`).getTime() - 24 * 60 * 60 * 1000
      );
    if (toStr)
      widened.lte = new Date(
        new Date(`${toStr}T23:59:59.999Z`).getTime() + 24 * 60 * 60 * 1000
      );

    const where: any = {
      ...(companyId && { companyId }),
      jobStatus: {
        name: { in: CANCELLED_STATUSES },
      },
    };

    if (fromStr || toStr) {
      where.OR = [
        { canceledAt: widened },
        { canceledAt: null, createdAt: widened },
      ];
    }
    if (tech) where.technicianId = tech as string;
    if (source) where.sourceId = source as string;

    // Technicians (without "view all jobs") only see their own jobs.
    Object.assign(where, await ownJobsWhere(req));

    // Fetch jobs (including cancel reason)
    const rawJobs = await prisma.job.findMany({
      where,
      select: {
        id: true,
        shortId: true,
        customerName: true,
        customerPhone: true,
        customerPhone2: true,
        customerAddress: true,
        description: true,
        createdAt: true,
        timezone: true,

        canceledReason: true,
        canceledAt: true,

        technician: { select: { name: true } },
        source: { select: { name: true } },
        jobStatus: { select: { name: true } },
      },
      orderBy: { canceledAt: "desc" },
    });

    // Per-job timezone range filter (by cancel date, createdAt fallback)
    const jobs = rawJobs.filter((job: any) => {
      if (!fromStr && !toStr) return true;
      const d = job.canceledAt || job.createdAt;
      if (!d) return false;
      const local = formatInTimeZone(
        d,
        job.timezone || DEFAULT_TZ,
        "yyyy-MM-dd"
      );
      if (fromStr && local < fromStr) return false;
      if (toStr && local > toStr) return false;
      return true;
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

    let leadSourceSummary = Object.values(leadSourceMap);

    // Restricted technician — hide the lead source on each job and the summary.
    if (await limitReportToTech(req)) {
      jobs.forEach((j: any) => {
        j.source = null;
        j.sourceId = null;
      });
      leadSourceSummary = [];
    }

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