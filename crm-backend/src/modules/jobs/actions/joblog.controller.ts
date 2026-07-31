import { Request, Response } from "express";
import prisma from "../../../prisma/client";

/* ============================================================
   JOB LOG AUDIT ACTIONS
   Used by the Log tab to move/delete an incoming-call log entry
   (attach it to the right job, remove it from the wrong one).
============================================================ */

// DELETE /jobs/logs/:logId  — remove a log from its job.
export async function deleteJobLog(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const { logId } = req.params;

    const log = await prisma.jobLog.findFirst({
      where: { id: logId, job: { companyId } },
    });
    if (!log) return res.status(404).json({ error: "Log not found" });

    await prisma.jobLog.delete({ where: { id: logId } });
    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteJobLog error:", err);
    return res.status(500).json({ error: "Failed to delete log" });
  }
}

// POST /jobs/logs/:logId/move  { targetShortId }
// Copy the log onto the target job, then remove it from the source job.
export async function moveJobLog(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const { logId } = req.params;
    const targetShortId = String(req.body?.targetShortId || "").toUpperCase();

    if (!targetShortId) {
      return res.status(400).json({ error: "targetShortId is required" });
    }

    const log = await prisma.jobLog.findFirst({
      where: { id: logId, job: { companyId } },
    });
    if (!log) return res.status(404).json({ error: "Log not found" });

    const target = await prisma.job.findFirst({
      where: { shortId: targetShortId, companyId },
      select: { id: true, shortId: true },
    });
    if (!target) return res.status(404).json({ error: "Target job not found" });

    if (target.id === log.jobId) {
      return res.json({ ok: true, targetShortId: target.shortId }); // no-op
    }

    await prisma.jobLog.create({
      data: {
        jobId: target.id,
        type: log.type,
        text: log.text,
        userId: req.user!.id,
      },
    });
    await prisma.jobLog.delete({ where: { id: logId } });

    return res.json({ ok: true, targetShortId: target.shortId });
  } catch (err) {
    console.error("moveJobLog error:", err);
    return res.status(500).json({ error: "Failed to move log" });
  }
}
