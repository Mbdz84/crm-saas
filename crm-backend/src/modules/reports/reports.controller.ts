import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { formatInTimeZone } from "date-fns-tz";

/* ============================================================
   /reports?from=2025-01-01&to=2025-01-31&status=closed
============================================================ */
export async function getReports(req: Request, res: Response) {
  try {
    const { from, to, tech, jobType, source, groupBy } = req.query;

    const DEFAULT_TZ = "America/Chicago";
    const fromStr = typeof from === "string" && from ? from : undefined;
    const toStr = typeof to === "string" && to ? to : undefined;

    // Known status buckets
    const CLOSED_STATUSES = ["Closed"];
    const CANCELLED_STATUSES = ["Canceled", "Cancelled", "Cancel"];

    /* --------------------------------------------------------
       SAFE COMPANY ID
    -------------------------------------------------------- */
    const companyId = req.user?.companyId || null;

    /* --------------------------------------------------------
       DATE FILTER (widened UTC window)
       This only narrows the DB query. Exact day membership is
       decided per job below using each job's OWN timezone, so a
       job counts for the day it falls on in its own timezone.
       The ±1 day pad ensures no edge job is dropped early.
    -------------------------------------------------------- */
    const dateFilter: any = {};
    if (fromStr)
      dateFilter.gte = new Date(
        new Date(`${fromStr}T00:00:00.000Z`).getTime() - 24 * 60 * 60 * 1000
      );
    if (toStr)
      dateFilter.lte = new Date(
        new Date(`${toStr}T23:59:59.999Z`).getTime() + 24 * 60 * 60 * 1000
      );

    /* --------------------------------------------------------
       WHERE CLAUSE (do NOT use isClosingLocked)
    -------------------------------------------------------- */
    const where: any = {
      ...(companyId && { companyId }),
    };

    if (tech) where.technicianId = tech as string;
    if (jobType) where.jobTypeId = jobType as string;
    if (source) where.sourceId = source as string;


    // Date filtering: closed jobs by closedAt, canceled jobs by canceledAt
if (from || to) {
  where.OR = [
    {
      closedAt: dateFilter,
    },
    {
      canceledAt: dateFilter,
    },
  ];
}

    /* --------------------------------------------------------
       FETCH JOBS
    ------------------------------------------------------------ */
    const rawJobs = await prisma.job.findMany({
      where,
      include: {
        closing: true,
        technician: true,
        jobType: true,
        source: true,
        jobStatus: true,
      },
      orderBy: { closedAt: "desc" },
    });

    // Helper to get normalized status name
    function getStatusName(job: any): string {
      return (job.jobStatus?.name || job.status || "").trim();
    }

    /* --------------------------------------------------------
       PER-JOB TIMEZONE RANGE FILTER
       A job belongs to a calendar day based on its OWN timezone.
       Closed jobs are judged by closedAt, canceled by canceledAt.
    -------------------------------------------------------- */
    function jobInRange(job: any): boolean {
      if (!fromStr && !toStr) return true;

      const status = getStatusName(job);
      const d = CLOSED_STATUSES.includes(status)
        ? job.closedAt
        : CANCELLED_STATUSES.includes(status)
        ? job.canceledAt
        : job.closedAt || job.canceledAt;

      if (!d) return false;

      const local = formatInTimeZone(
        d,
        job.timezone || DEFAULT_TZ,
        "yyyy-MM-dd"
      );

      if (fromStr && local < fromStr) return false;
      if (toStr && local > toStr) return false;
      return true;
    }

    const jobs = rawJobs.filter(jobInRange);

    // Jobs that are really CLOSED (used for money + table rows)
    const closedJobs = jobs.filter((job: any) =>
      CLOSED_STATUSES.includes(getStatusName(job))
    );

    /* --------------------------------------------------------
       AGGREGATE TOTALS (ONLY CLOSED JOBS WITH CLOSING DATA)
    ------------------------------------------------------------ */
    let totalRevenue = 0;
    let totalTechProfit = 0;
    let totalLeadProfit = 0;
    let totalCompanyProfit = 0;

    closedJobs.forEach((job: any) => {
      if (!job.closing) return;

      totalRevenue += Number(job.closing.totalAmount || 0);
      totalTechProfit += Number(job.closing.techProfit || 0);
      totalLeadProfit += Number(job.closing.leadProfit || 0);

      // Company Profit = the company's own split, PLUS the profit of any
      // technician or lead source the company owns (flagged in settings).
      totalCompanyProfit += Number(job.closing.companyProfitDisplay || 0);
      if (job.technician?.isOwner) {
        totalCompanyProfit += Number(job.closing.techProfit || 0);
      }
      if (job.source?.isOwner) {
        totalCompanyProfit += Number(job.closing.leadProfit || 0);
      }
    });

    const summary = {
      count: closedJobs.length,
      totalRevenue,
      avgJobValue: closedJobs.length ? totalRevenue / closedJobs.length : 0,
      totalTechProfit,
      totalLeadProfit,
      totalCompanyProfit,
    };

    /* --------------------------------------------------------
       OPTIONAL GROUPING (on closed jobs)
    ------------------------------------------------------------ */
    let grouped: any = {};

    if (groupBy === "day") {
  closedJobs.forEach((job: any) => {
    if (!job.closedAt) return;

    const key = formatInTimeZone(
      job.closedAt,
      job.timezone || DEFAULT_TZ,
      "yyyy-MM-dd"
    );

    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(job);
  });
}

    if (groupBy === "month") {
  closedJobs.forEach((job: any) => {
    if (!job.closedAt) return;

    const key = formatInTimeZone(
      job.closedAt,
      job.timezone || DEFAULT_TZ,
      "yyyy-MM"
    );

    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(job);
  });
}

    if (groupBy === "technician") {
      closedJobs.forEach((job: any) => {
        const key = job.technician?.name || "Unassigned";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(job);
      });
    }

    /* --------------------------------------------
       TECHNICIAN SUMMARY  (uses ALL jobs)
    ---------------------------------------------*/
    const techSummary: Record<
      string,
      { name: string; total: number; closed: number; cancelled: number }
    > = {};

    jobs.forEach((job: any) => {
      const techName = job.technician?.name || "Unassigned";
      const status = getStatusName(job);

      if (!techSummary[techName]) {
        techSummary[techName] = {
          name: techName,
          total: 0,
          closed: 0,
          cancelled: 0,
        };
      }

      techSummary[techName].total++;

      if (CLOSED_STATUSES.includes(status)) techSummary[techName].closed++;
      if (CANCELLED_STATUSES.includes(status)) techSummary[techName].cancelled++;
    });

    const technicianSummary = Object.values(techSummary);

    /* --------------------------------------------
       LEAD SOURCE SUMMARY (uses ALL jobs)
    ---------------------------------------------*/
    const leadSourceMap: Record<
      string,
      { name: string; total: number; closed: number; cancelled: number }
    > = {};

    jobs.forEach((job: any) => {
      const sourceName = job.source?.name || "Unknown Source";
      const status = getStatusName(job);

      if (!leadSourceMap[sourceName]) {
        leadSourceMap[sourceName] = {
          name: sourceName,
          total: 0,
          closed: 0,
          cancelled: 0,
        };
      }

      leadSourceMap[sourceName].total++;

      if (CLOSED_STATUSES.includes(status)) {
        leadSourceMap[sourceName].closed++;
      }

      if (CANCELLED_STATUSES.includes(status)) {
        leadSourceMap[sourceName].cancelled++;
      }
    });

    const leadSourceSummary = Object.values(leadSourceMap);

    /* --------------------------------------------------------
       RESPONSE
       - jobs / rows → ONLY CLOSED JOBS (for tables & amounts)
       - summaries → computed from all jobs where needed
    ------------------------------------------------------------ */
res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
res.setHeader("Pragma", "no-cache");
    return res.json({
      summary,
      grouped,
      jobs: closedJobs,
      rows: closedJobs,
      technicianSummary: technicianSummary ?? [],
      leadSourceSummary,
    });
  } catch (err) {
    console.error("🔥 REPORTS ERROR:", err);
    return res.status(500).json({ error: "Failed to load reports" });
  }
}