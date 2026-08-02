import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { techPerms } from "../../utils/scope";
import { logJobEvent } from "../../utils/jobLogger";

/* Admins/owners only (perms === null for them). */
async function requireAdmin(req: any, res: Response): Promise<boolean> {
  if (await techPerms(req)) {
    res.status(403).json({ error: "Admins only." });
    return false;
  }
  return true;
}

function partyLabel(t: string) {
  return t === "leadSource" ? "lead source" : "technician";
}

/* ------------------------------------------------------------
   POST /settlements/settle
   Body: { partyType, partyId, partyName?, periodStart, periodEnd,
           jobs: [{ jobId, amount }] }
   Records one Settlement + a JobPartySettlement stamp per job.
------------------------------------------------------------ */
export async function settleReport(req: any, res: Response) {
  if (!(await requireAdmin(req, res))) return;
  try {
    const companyId = req.user.companyId;
    const {
      partyType,
      partyId,
      partyName,
      periodStart,
      periodEnd,
      jobs,
    } = req.body || {};

    if (!["technician", "leadSource"].includes(partyType))
      return res.status(400).json({ error: "Invalid partyType" });
    if (!partyId || !periodStart || !periodEnd || !Array.isArray(jobs))
      return res.status(400).json({ error: "Missing fields" });

    // Only settle jobs not already settled with this party.
    const already = await prisma.jobPartySettlement.findMany({
      where: { partyType, jobId: { in: jobs.map((j: any) => j.jobId) } },
      select: { jobId: true },
    });
    const settledSet = new Set(already.map((a) => a.jobId));
    const toSettle = jobs.filter((j: any) => !settledSet.has(j.jobId));

    if (toSettle.length === 0)
      return res
        .status(400)
        .json({ error: "All jobs in this report are already settled." });

    const amount = toSettle.reduce(
      (s: number, j: any) => s + Number(j.amount || 0),
      0
    );

    const settlement = await prisma.settlement.create({
      data: {
        companyId,
        partyType,
        partyId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        amount,
        settledById: req.user.id,
      },
    });

    await prisma.jobPartySettlement.createMany({
      data: toSettle.map((j: any) => ({
        companyId,
        jobId: j.jobId,
        partyType,
        partyId,
        settlementId: settlement.id,
        amount: Number(j.amount || 0),
      })),
      skipDuplicates: true,
    });

    // Log on each job so the Log tab shows who it was settled with.
    const weekText = `${new Date(periodStart).toLocaleDateString()} – ${new Date(
      periodEnd
    ).toLocaleDateString()}`;
    const label = partyName || partyLabel(partyType);
    await Promise.all(
      toSettle.map((j: any) =>
        logJobEvent({
          jobId: j.jobId,
          type: "system",
          text: `Settled with ${partyLabel(partyType)} ${label} — week ${weekText}`,
          userId: req.user.id,
        })
      )
    );

    return res.json({ settlement, settledCount: toSettle.length });
  } catch (err) {
    console.error("settleReport error:", err);
    return res.status(500).json({ error: "Failed to settle report" });
  }
}

/* ------------------------------------------------------------
   GET /settlements?partyType=&partyId=&limit=&offset=
   History rows for a party (newest first). For the Payments tab
   and the report's inline $ panel.
------------------------------------------------------------ */
export async function listSettlements(req: any, res: Response) {
  if (!(await requireAdmin(req, res))) return;
  try {
    const companyId = req.user.companyId;
    const { partyType, partyId } = req.query;
    const limit = Math.min(Number(req.query.limit) || 5, 100);
    const offset = Number(req.query.offset) || 0;

    if (!partyType || !partyId)
      return res.status(400).json({ error: "partyType and partyId required" });

    const where = { companyId, partyType: String(partyType), partyId: String(partyId) };
    const [rows, total, unpaidAgg] = await Promise.all([
      prisma.settlement.findMany({
        where,
        orderBy: { createdAt: "desc" }, // newest settlement first
        skip: offset,
        take: limit,
      }),
      prisma.settlement.count({ where }),
      // Total still owed = sum of every unpaid row (across all pages).
      prisma.settlement.aggregate({
        where: { ...where, paid: false },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return res.json({
      rows,
      total,
      unpaidTotal: Number(unpaidAgg._sum.amount || 0),
      unpaidCount: unpaidAgg._count,
    });
  } catch (err) {
    console.error("listSettlements error:", err);
    return res.status(500).json({ error: "Failed to load settlements" });
  }
}

/* ------------------------------------------------------------
   GET /settlements/status?partyType=&partyId=&jobIds=a,b,c
   Which of these jobs are already settled with this party (and in
   which period) — powers the report "Settled" column + warning.
------------------------------------------------------------ */
export async function settlementStatus(req: any, res: Response) {
  if (!(await requireAdmin(req, res))) return;
  try {
    const { partyType, partyId } = req.query;
    const jobIds = String(req.query.jobIds || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!partyType || !partyId || jobIds.length === 0)
      return res.json({ settled: {} });

    const stamps = await prisma.jobPartySettlement.findMany({
      where: { partyType: String(partyType), partyId: String(partyId), jobId: { in: jobIds } },
      include: {
        settlement: {
          select: { id: true, periodStart: true, periodEnd: true, paid: true },
        },
      },
    });

    const settled: Record<string, any> = {};
    for (const s of stamps) {
      settled[s.jobId] = {
        settlementId: s.settlementId,
        periodStart: s.settlement.periodStart,
        periodEnd: s.settlement.periodEnd,
        paid: s.settlement.paid,
      };
    }
    return res.json({ settled });
  } catch (err) {
    console.error("settlementStatus error:", err);
    return res.status(500).json({ error: "Failed to load status" });
  }
}

/* ------------------------------------------------------------
   PATCH /settlements/:id  — toggle paid / set paidAt / edit note
------------------------------------------------------------ */
export async function updateSettlement(req: any, res: Response) {
  if (!(await requireAdmin(req, res))) return;
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { paid, paidAt, note } = req.body || {};

    const existing = await prisma.settlement.findFirst({ where: { id, companyId } });
    if (!existing) return res.status(404).json({ error: "Not found" });

    const data: any = {};
    if (paid !== undefined) {
      data.paid = Boolean(paid);
      // Default the paid date to today when checking, clear it when unchecking.
      data.paidAt = paid ? (paidAt ? new Date(paidAt) : new Date()) : null;
    } else if (paidAt !== undefined) {
      data.paidAt = paidAt ? new Date(paidAt) : null;
    }
    if (note !== undefined) data.note = note;

    const updated = await prisma.settlement.update({ where: { id }, data });
    return res.json({ settlement: updated });
  } catch (err) {
    console.error("updateSettlement error:", err);
    return res.status(500).json({ error: "Failed to update settlement" });
  }
}

/* ------------------------------------------------------------
   POST /settlements/manual — add a manual history row (e.g. bonus)
   Body: { partyType, partyId, periodStart, periodEnd, amount, note }
------------------------------------------------------------ */
export async function addManualSettlement(req: any, res: Response) {
  if (!(await requireAdmin(req, res))) return;
  try {
    const companyId = req.user.companyId;
    const { partyType, partyId, periodStart, periodEnd, amount, note } =
      req.body || {};

    if (!["technician", "leadSource"].includes(partyType))
      return res.status(400).json({ error: "Invalid partyType" });
    if (!partyId || !periodStart)
      return res.status(400).json({ error: "Missing fields" });

    const settlement = await prisma.settlement.create({
      data: {
        companyId,
        partyType,
        partyId,
        periodStart: new Date(periodStart),
        // Single-date row → end defaults to the same day.
        periodEnd: new Date(periodEnd || periodStart),
        amount: Number(amount || 0),
        note: note || null,
        manual: true,
        settledById: req.user.id,
      },
    });

    return res.json({ settlement });
  } catch (err) {
    console.error("addManualSettlement error:", err);
    return res.status(500).json({ error: "Failed to add row" });
  }
}
