import { Request, Response } from "express";
import prisma from "../../prisma/client";
import {
  startOfDay,
  endOfDay,
  parseISO,
} from "date-fns";

/* ============================================================
   /reports?from=2025-01-01&to=2025-01-31&status=closed
============================================================ */
export async function getReports(req: Request, res: Response) {
  try {
    const { from, to, tech, jobType, source, groupBy, status } = req.query;

    /* --------------------------------------------------------
       SAFE COMPANY ID (do NOT force req.user)
    -------------------------------------------------------- */
    const companyId = req.user?.companyId || null;

    /* --------------------------------------------------------
       DATE FILTER
    -------------------------------------------------------- */
    const dateFilter: any = {};
    if (from) dateFilter.gte = startOfDay(parseISO(from as string));
    if (to) dateFilter.lte = endOfDay(parseISO(to as string));

    /* --------------------------------------------------------
   WHERE CLAUSE
-------------------------------------------------------- */
const where: any = {
  ...(companyId && { companyId }),
  isClosingLocked: true,
};

if (tech) where.technicianId = tech;
if (jobType) where.jobTypeId = jobType;
if (source) where.sourceId = source;

// closedAt date filter
if (from || to) where.closedAt = dateFilter;

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

    /* --------------------------------------------------------
       AGGREGATE TOTALS
    ------------------------------------------------------------ */
    let totalRevenue = 0;
    let totalTechProfit = 0;
    let totalLeadProfit = 0;
    let totalCompanyProfit = 0;

    jobs.forEach((job) => {
      if (!job.closing) return;

      totalRevenue += Number(job.closing.totalAmount || 0);
      totalTechProfit += Number(job.closing.techProfit || 0);
      totalLeadProfit += Number(job.closing.leadProfit || 0);
      totalCompanyProfit += Number(job.closing.companyProfitDisplay || 0);
    });

    const summary = {
      count: jobs.length,
      totalRevenue,
      avgJobValue: jobs.length ? totalRevenue / jobs.length : 0,
      totalTechProfit,
      totalLeadProfit,
      totalCompanyProfit,
    };

    /* --------------------------------------------------------
       OPTIONAL GROUPING
    ------------------------------------------------------------ */
    let grouped: any = {};

    if (groupBy === "day") {
      jobs.forEach((job) => {
        const key = job.closedAt?.toISOString().split("T")[0] || "Unknown";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(job);
      });
    }

    if (groupBy === "month") {
      jobs.forEach((job) => {
        const d = job.closedAt ? new Date(job.closedAt) : null;
        const key = d
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
          : "Unknown";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(job);
      });
    }

    if (groupBy === "technician") {
      jobs.forEach((job) => {
        const key = job.technician?.name || "Unassigned";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(job);
      });
    }


/* --------------------------------------------
   TECHNICIAN SUMMARY
---------------------------------------------*/
const techSummary: any = {};

jobs.forEach(job => {
  const techName = job.technician?.name || "Unassigned";
  const status = job.jobStatus?.name;  // <-- real status

  if (!techSummary[techName]) {
    techSummary[techName] = {
      name: techName,
      total: 0,
      closed: 0,
      cancelled: 0,
    };
  }

  techSummary[techName].total++;

  if (status === "Closed") techSummary[techName].closed++;
  if (status === "Canceled" || status === "Cancelled")
  techSummary[techName].cancelled++;
});

const technicianSummary = Object.values(techSummary);


/* --------------------------------------------
   LEAD SOURCE SUMMARY
---------------------------------------------*/
const leadSourceMap: any = {};

jobs.forEach((job) => {
  const sourceName = job.source?.name || "Unknown Source";
  const status = job.jobStatus?.name || job.status || "Unknown";

  if (!leadSourceMap[sourceName]) {
    leadSourceMap[sourceName] = {
      name: sourceName,
      total: 0,
      closed: 0,
      cancelled: 0,
    };
  }

  leadSourceMap[sourceName].total++;

  if (status === "Closed") {
    leadSourceMap[sourceName].closed++;
  }

  if (status === "Canceled" || status === "Cancelled") {
    leadSourceMap[sourceName].cancelled++;
  }
});

const leadSourceSummary = Object.values(leadSourceMap);




//// ends

return res.json({
  summary,
  grouped,
  jobs,
  rows: jobs,
  technicianSummary: technicianSummary ?? [],
  leadSourceSummary,
});
} catch (err) {
  console.error("🔥 REPORTS ERROR:", err);
  return res.status(500).json({ error: "Failed to load reports" });
}
}