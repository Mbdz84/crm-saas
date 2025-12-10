import { Request, Response } from "express";
import prisma from "../../../prisma/client";

/* -----------------------------------------
   Normalize phone for flexible searching
----------------------------------------- */
function normalizePhone(input: string | undefined | null): string {
  if (!input) return "";
  return input.replace(/[^\d]/g, ""); // remove anything not a digit
}

export async function searchJobs(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;

    const qRaw = (req.query.q as string | undefined) || "";
    const q = qRaw.trim();

    const from = req.query.from as string | undefined; // YYYY-MM-DD
    const to = req.query.to as string | undefined;     // YYYY-MM-DD

    const normalizedPhone = normalizePhone(q); // <-- key for phone search

    const where: any = {
      companyId,
    };

    /* -----------------------------------------
       DATE FILTER (OPTIONAL)
    ----------------------------------------- */
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from + "T00:00:00");
      if (to) where.createdAt.lte = new Date(to + "T23:59:59");
    }

    /* -----------------------------------------
       MAIN SEARCH LOGIC
    ----------------------------------------- */
    if (q) {
      const like = { contains: q, mode: "insensitive" as const };

      where.OR = [
        { shortId: like },
        { title: like },
        { description: like },
        { customerName: like },
        { customerAddress: like },
        { canceledReason: like },

        // Normal phone contains match (user typed dashes or spaces)
        { customerPhone: like },
        { customerPhone2: like },
      ];

      /* -----------------------------------------
         SMART PHONE MATCHING  
         (Match ANY phone format)
      ----------------------------------------- */
      if (normalizedPhone.length >= 3) {
        // only run if at least 3 digits typed
        where.OR.push({
          customerPhone: { contains: normalizedPhone },
        });
        where.OR.push({
          customerPhone2: { contains: normalizedPhone },
        });
      }

      /* -----------------------------------------
         If user typed a possible UUID
      ----------------------------------------- */
      if (/^[0-9a-fA-F-]{20,}$/.test(q)) {
        where.OR.push({ id: q });
      }
    }

    /* -----------------------------------------
       RUN SEARCH
    ----------------------------------------- */
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