import { Request, Response } from "express";
import prisma from "../../../prisma/client";
import { ownJobsWhere, hideClientPhone, techPerms } from "../../../utils/scope";

export async function searchJobs(req: Request, res: Response) {
  try {
    const perms = await techPerms(req);
    if (perms && !perms.canSeeSearch) {
      return res.status(403).json({ error: "Search disabled" });
    }
    const companyId = req.user!.companyId;

    const qRaw = (req.query.q as string | undefined) || "";
    const q = qRaw.trim();

    const from = req.query.from as string | undefined; // YYYY-MM-DD
    const to = req.query.to as string | undefined;     // YYYY-MM-DD

    // Digits of the query; use the LAST 10 when a full number is typed so
    // country code / formatting never matters.
    const rawDigits = q.replace(/\D/g, "");
    const queryDigits =
      rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;

    /* -----------------------------------------
       FORMAT-PROOF PHONE MATCH
       Strip non-digits from the stored numbers and compare, so
       2125551234 / (212) 555-1234 / +12125551234 / 212-555-1234
       all find the same job.
    ----------------------------------------- */
    let phoneMatchIds: string[] = [];
    if (queryDigits.length >= 4) {
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Job"
        WHERE "companyId" = ${companyId}
          AND (
            regexp_replace(COALESCE("customerPhone", ''), '[^0-9]', '', 'g') LIKE ${
              "%" + queryDigits + "%"
            }
            OR regexp_replace(COALESCE("customerPhone2", ''), '[^0-9]', '', 'g') LIKE ${
              "%" + queryDigits + "%"
            }
          )
      `;
      phoneMatchIds = rows.map((r) => r.id);
    }

    const where: any = {
      companyId,
      ...(await ownJobsWhere(req)),
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
         FORMAT-PROOF PHONE MATCH (ids resolved above)
      ----------------------------------------- */
      if (phoneMatchIds.length) {
        where.OR.push({ id: { in: phoneMatchIds } });
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
    closing: {
      select: {
        totalAmount: true,
      },
    },
  },
});

    if (await hideClientPhone(req)) {
      results.forEach((r: any) => {
        r.customerPhone = null;
        r.customerPhone2 = null;
      });
    }

    return res.json({ results });
  } catch (err) {
    console.error("searchJobs error:", err);
    return res.status(500).json({ error: "Failed to search jobs" });
  }
}