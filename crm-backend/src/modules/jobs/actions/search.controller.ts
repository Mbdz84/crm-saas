import { Request, Response } from "express";
import prisma from "../../../prisma/client";

export async function searchJobs(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const q = (req.query.q as string | undefined)?.trim() || "";
    const from = req.query.from as string | undefined; // "YYYY-MM-DD"
    const to = req.query.to as string | undefined;     // "YYYY-MM-DD"

    const where: any = {
      companyId,
    };

    // 🗓 Date filter on createdAt (optional)
    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(from + "T00:00:00");
      }
      if (to) {
        where.createdAt.lte = new Date(to + "T23:59:59");
      }
    }

    // 🔍 Text search across fields
    if (q) {
      const like = { contains: q, mode: "insensitive" as const };

      where.OR = [
        { shortId: like },           // Job ID (short)
        { title: like },
        { description: like },       // notes
        { customerName: like },      // name
        { customerPhone: like },     // phone 1
        { customerPhone2: like },    // phone 2
        { customerAddress: like },   // address
        { canceledReason: like },    // cancel reason
      ];

      // If q looks like a full UUID, also try exact match on id
      if (/^[0-9a-fA-F-]{20,}$/.test(q)) {
        where.OR.push({ id: q });
      }
    }

    const results = await prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        jobStatus: true,
        technician: true,
      },
    });

    return res.json({ results });
  } catch (err) {
    console.error("searchJobs error:", err);
    return res.status(500).json({ error: "Failed to search jobs" });
  }
}