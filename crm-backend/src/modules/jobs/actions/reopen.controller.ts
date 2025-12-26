import { Request, Response } from "express";
import prisma from "../../../prisma/client";
import { logJobEvent } from "../../../utils/jobLogger";


export async function reopenJob(req: Request, res: Response) {
  try {
    const { shortId } = req.params;
    const user = req.user!;

    if (user.role !== "admin")
      return res.status(403).json({ error: "Only admin can reopen jobs." });

    const job = await prisma.job.findUnique({
      where: { shortId },
      include: { closing: true },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });
    if (!job.isClosingLocked)
      return res.status(400).json({ error: "Job is not closed." });

    const updated = await prisma.job.update({
      where: { id: job.id },
      data: {
        isClosingLocked: false,
        closedAt: null,
      },
    });

    await logJobEvent({
  jobId: job.id,
  type: "reopened",
  text: "Job reopened",
  userId: user.id,
});

    return res.json({
      message: "Job reopened — closing data preserved",
      job: updated,
    });
  } catch (err) {
    console.error("reopenJob error:", err);
    return res.status(500).json({ error: "Failed to reopen job" });
  }
}