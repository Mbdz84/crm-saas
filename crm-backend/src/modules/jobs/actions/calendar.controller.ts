import { Request, Response } from "express";
import prisma from "../../../prisma/client";
import {
  ownJobsWhere,
  hideClientPhone,
  calendarBlocked,
} from "../../../utils/scope";

/**
 * GET /jobs/calendar?from=ISO&to=ISO
 * Returns scheduled jobs (appointments) in the given range for the company.
 */
export async function getCalendarJobs(req: Request, res: Response) {
  try {
    if (await calendarBlocked(req)) {
      return res.status(403).json({ error: "Calendar access disabled" });
    }
    const companyId = req.user!.companyId;
    const { from, to } = req.query as { from?: string; to?: string };

    const where: any = { companyId, ...(await ownJobsWhere(req)) };
    if (from || to) {
      where.scheduledAt = {};
      if (from) where.scheduledAt.gte = new Date(from);
      if (to) where.scheduledAt.lt = new Date(to);
    } else {
      where.scheduledAt = { not: null };
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      select: {
        shortId: true,
        customerName: true,
        customerPhone: true,
        customerAddress: true,
        scheduledAt: true,
        status: true,
        technician: { select: { name: true } },
        source: { select: { name: true } },
        jobStatus: { select: { name: true, color: true } },
      },
    });

    const hidePhone = await hideClientPhone(req);

    return res.json(
      jobs.map((j) => ({
        shortId: j.shortId,
        customerName: j.customerName,
        customerPhone: hidePhone ? null : j.customerPhone,
        customerAddress: j.customerAddress,
        scheduledAt: j.scheduledAt,
        technician: j.technician?.name || null,
        leadSource: j.source?.name || null,
        status: j.jobStatus?.name || j.status,
        color: j.jobStatus?.color || null,
      }))
    );
  } catch (err) {
    console.error("🔥 getCalendarJobs error:", err);
    return res.status(500).json({ error: "Failed to load calendar" });
  }
}
