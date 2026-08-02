import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

// Statuses that mean a job is no longer "open" on the board
const OPEN_EXCLUDE = ["Closed", "Canceled"];

export async function getDashboardSummary(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { timezone: true },
    });
    const tz = company?.timezone || "America/Chicago";

    // Start/end of "today" in the company's timezone (for appointments)
    const zn = toZonedTime(new Date(), tz);
    const todayStart = fromZonedTime(
      new Date(zn.getFullYear(), zn.getMonth(), zn.getDate(), 0, 0, 0, 0),
      tz
    );
    const todayEnd = fromZonedTime(
      new Date(zn.getFullYear(), zn.getMonth(), zn.getDate() + 1, 0, 0, 0, 0),
      tz
    );

    // Range for the Created/Closed/Revenue tiles (from query, default = today)
    const { from, to } = req.query as { from?: string; to?: string };
    const rangeStart = from ? new Date(from) : todayStart;
    const rangeEnd = to ? new Date(to) : todayEnd;

    const [
      openJobs,
      createdToday,
      closedToday,
      canceledInRange,
      closedForMoney,
      unreadAgg,
      unassigned,
      appointments,
    ] = await Promise.all([
      prisma.job.count({
        where: { companyId, jobStatus: { name: { notIn: OPEN_EXCLUDE } } },
      }),
      prisma.job.count({
        where: { companyId, createdAt: { gte: rangeStart, lt: rangeEnd } },
      }),
      prisma.job.count({
        where: { companyId, closedAt: { gte: rangeStart, lt: rangeEnd } },
      }),
      prisma.job.count({
        where: { companyId, canceledAt: { gte: rangeStart, lt: rangeEnd } },
      }),
      // Closed jobs (one closing each) for revenue + company profit — computed
      // the SAME way as the Reports page so the numbers match exactly.
      prisma.job.findMany({
        where: {
          companyId,
          closedAt: { gte: rangeStart, lt: rangeEnd },
          closing: { isNot: null },
        },
        select: {
          technician: { select: { isOwner: true } },
          source: { select: { isOwner: true } },
          closing: {
            select: {
              totalAmount: true,
              companyProfitDisplay: true,
              techProfit: true,
              leadProfit: true,
            },
          },
        },
      }),
      prisma.smsConversation.aggregate({
        _sum: { unread: true },
        where: { companyId, box: "inbox", muted: false },
      }),
      prisma.job.findMany({
        where: {
          companyId,
          technicianId: null,
          jobStatus: { name: { notIn: OPEN_EXCLUDE } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          shortId: true,
          customerName: true,
          customerPhone: true,
          status: true,
          createdAt: true,
          jobStatus: { select: { name: true } },
        },
      }),
      prisma.job.findMany({
        where: {
          companyId,
          scheduledAt: { gte: todayStart, lt: todayEnd },
          jobStatus: { name: { notIn: OPEN_EXCLUDE } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 12,
        select: {
          shortId: true,
          customerName: true,
          scheduledAt: true,
          status: true,
          technician: { select: { name: true } },
          jobStatus: { select: { name: true } },
        },
      }),
    ]);

    // Same math as the Reports page: company profit = the company's own split,
    // plus the profit of any technician / lead source the company owns.
    let revenue = 0;
    let companyProfit = 0;
    for (const j of closedForMoney as any[]) {
      const c = j.closing;
      if (!c) continue;
      revenue += Number(c.totalAmount || 0);
      companyProfit += Number(c.companyProfitDisplay || 0);
      if (j.technician?.isOwner) companyProfit += Number(c.techProfit || 0);
      if (j.source?.isOwner) companyProfit += Number(c.leadProfit || 0);
    }

    return res.json({
      openJobs,
      created: createdToday,
      closed: closedToday,
      canceled: canceledInRange,
      revenue,
      companyProfit,
      unreadSms: unreadAgg._sum.unread || 0,
      unassigned: unassigned.map((j) => ({
        shortId: j.shortId,
        customerName: j.customerName,
        customerPhone: j.customerPhone,
        status: j.jobStatus?.name || j.status,
        createdAt: j.createdAt,
      })),
      appointments: appointments.map((j) => ({
        shortId: j.shortId,
        customerName: j.customerName,
        scheduledAt: j.scheduledAt,
        technician: j.technician?.name || null,
        status: j.jobStatus?.name || j.status,
      })),
    });
  } catch (err) {
    console.error("🔥 dashboard summary error:", err);
    return res.status(500).json({ error: "Failed to load dashboard" });
  }
}
