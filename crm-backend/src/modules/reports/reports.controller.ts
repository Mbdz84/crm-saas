import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { startOfDay, endOfDay, parseISO } from "date-fns";

/* ============================================================
   /reports?from=2025-01-01&to=2025-01-31&status=closed
============================================================ */
export async function getReports(req: Request, res: Response) {
  try {
    const { from, to, tech, jobType, source, groupBy } = req.query;

    // Known status buckets
    const CLOSED_STATUSES = ["Closed"];
    const CANCELLED_STATUSES = ["Canceled", "Cancelled", "Cancel"];

    /* --------------------------------------------------------
       SAFE COMPANY ID
    -------------------------------------------------------- */
    const companyId = req.user?.companyId || null;

    /* --------------------------------------------------------
       DATE FILTER (by closedAt)
    -------------------------------------------------------- */
    const dateFilter: any = {};
    if (from) dateFilter.gte = startOfDay(parseISO(from as string));
    if (to) dateFilter.lte = endOfDay(parseISO(to as string));

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
    const jobs = await prisma.job.findMany({
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
      totalCompanyProfit += Number(job.closing.companyProfitDisplay || 0);
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
        const key = job.closedAt?.toISOString().split("T")[0] || "Unknown";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(job);
      });
    }

    if (groupBy === "month") {
      closedJobs.forEach((job: any) => {
        const d = job.closedAt ? new Date(job.closedAt) : null;
        const key = d
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
          : "Unknown";
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