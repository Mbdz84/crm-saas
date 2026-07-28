import { Request, Response } from "express";
import prisma from "../../../prisma/client";

/**
 * POST /jobs/:shortId/refresh-extension
 * Force-regenerate call extensions for the job
 */
export async function refreshExtension(req: Request, res: Response) {
  try {
    const shortId = req.params.shortId.toUpperCase();
    const companyId = req.user!.companyId;

    const job = await prisma.job.findFirst({
      where: { shortId, companyId },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (!job.technicianId) {
      return res.status(400).json({ error: "No technician assigned" });
    }

    // 🔥 Deactivate ALL previous sessions for this job
    await prisma.jobCallSession.updateMany({
      where: {
        jobId: job.id,
        active: true,
      },
      data: {
        active: false,
        lastCallerPhone: null,
      },
    });

    const sessions: any[] = [];

    // ---------- PRIMARY PHONE ----------
    if (job.customerPhone) {
      sessions.push(
        await prisma.jobCallSession.create({
          data: {
            jobId: job.id,
            companyId,
            technicianId: job.technicianId,
            clientPhoneType: "primary",
            customerPhone: job.customerPhone.replace(/[^\d]/g, "").slice(-10),
            extension: await generateExtension(),
            active: true,
          },
        })
      );
    }

    // ---------- SECONDARY PHONE ----------
    if (job.customerPhone2) {
      sessions.push(
        await prisma.jobCallSession.create({
          data: {
            jobId: job.id,
            companyId,
            technicianId: job.technicianId,
            clientPhoneType: "secondary",
            customerPhone: job.customerPhone2.replace(/[^\d]/g, "").slice(-10),
            extension: await generateExtension(),
            active: true,
          },
        })
      );
    }

    // ✅ RETURN ONLY WHAT FRONTEND NEEDS
    return res.json({
  sessions: sessions.map((s) => ({
    clientPhoneType: s.clientPhoneType, // ✅ MATCH FRONTEND
    extension: s.extension,
    active: true,
  })),
});
  } catch (err) {
    console.error("refreshExtension error:", err);
    return res.status(500).json({ error: "Failed to refresh extensions" });
  }
}

/**
 * Ensure extensions exist (used on job open)
 * Does NOT regenerate unless missing
 */
export async function ensureJobExtensions(jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!job || !job.technicianId) return;
  if (["Closed", "Canceled"].includes(job.status)) return;

  const phones: { phone: string; type: "primary" | "secondary" }[] = [];

  if (job.customerPhone) {
    phones.push({
      phone: job.customerPhone.replace(/[^\d]/g, "").slice(-10),
      type: "primary",
    });
  }

  if (job.customerPhone2) {
    phones.push({
      phone: job.customerPhone2.replace(/[^\d]/g, "").slice(-10),
      type: "secondary",
    });
  }

  for (const p of phones) {
    const exists = await prisma.jobCallSession.findFirst({
      where: {
        jobId: job.id,
        clientPhoneType: p.type,
        active: true,
      },
    });

    if (exists) continue;

    await prisma.jobCallSession.create({
      data: {
        jobId: job.id,
        companyId: job.companyId,
        technicianId: job.technicianId,
        clientPhoneType: p.type,
        customerPhone: p.phone,
        extension: await generateExtension(),
        active: true,
      },
    });
  }
}

/**
 * Unique 4-digit extension.
 * Only ACTIVE sessions need distinct extensions (the inbound router matches on
 * `active: true`), and open jobs never approach the 9000-value space — so we
 * just retry until we find a number no active session is using.
 */
async function generateExtension(): Promise<string> {
  // Safety cap so a pathological state can never spin forever.
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = Math.floor(1000 + Math.random() * 9000).toString();

    const taken = await prisma.jobCallSession.findFirst({
      where: { extension: candidate, active: true },
      select: { id: true },
    });

    if (!taken) return candidate;
  }

  throw new Error("Could not generate a unique call extension");
}