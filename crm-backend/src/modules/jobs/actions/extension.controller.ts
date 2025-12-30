import { Request, Response } from "express";
import prisma from "../../../prisma/client";


export async function refreshExtension(req: Request, res: Response) {
  try {
    const shortId = req.params.shortId.toUpperCase();
    const companyId = req.user!.companyId;

    const job = await prisma.job.findFirst({
      where: { shortId, companyId },
    });

    if (!job) return res.status(404).json({ error: "Job not found" });
    if (!job.technicianId)
      return res.status(400).json({ error: "No technician assigned" });

    // Kill old sessions
    await prisma.jobCallSession.updateMany({
  where: { jobId: job.id },
  data: {
    active: false,
    lastCallerPhone: null, // 🔥 VERY IMPORTANT
  },
});

    const sessions = [];

    if (job.customerPhone) {
      sessions.push(
        await prisma.jobCallSession.create({
          data: {
            jobId: job.id,
            companyId,
            technicianId: job.technicianId,
            clientPhoneType: "primary",
            customerPhone: job.customerPhone!.replace(/[^\d]/g, "").slice(-10),
            extension: generateExtension(),
            active: true,
          },
        })
      );
    }

    if (job.customerPhone2) {
      sessions.push(
        await prisma.jobCallSession.create({
          data: {
            jobId: job.id,
            companyId,
            technicianId: job.technicianId,
            clientPhoneType: "secondary",
            customerPhone: job.customerPhone2!.replace(/[^\d]/g, "").slice(-10),
            extension: generateExtension(),
            active: true,
          },
        })
      );
    }

    return res.json({
  sessions: sessions.map((s) => ({
    phoneType: s.clientPhoneType,
    phone: s.customerPhone,
    extension: s.extension,
  })),
});
  } catch (err) {
    console.error("refreshExtension error:", err);
    return res.status(500).json({ error: "Failed to refresh extensions" });
  }
}

function generateExtension() {
  return Math.floor(100 + Math.random() * 9000).toString();
}
export async function ensureJobExtensions(jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!job || !job.technicianId) return;

  if (["Closed", "Canceled"].includes(job.status)) return;

  const phones: { phone: string; type: "primary" | "secondary" }[] = [];

  if (job.customerPhone) {
    phones.push({ phone: job.customerPhone, type: "primary" });
  }

  if (job.customerPhone2) {
    phones.push({ phone: job.customerPhone2, type: "secondary" });
  }

  for (const p of phones) {
    const exists = await prisma.jobCallSession.findFirst({
      where: {
        jobId: job.id,
        customerPhone: p.phone,
      },
    });

    if (exists) continue;

    await prisma.jobCallSession.create({
      data: {
        jobId: job.id,
        technicianId: job.technicianId,
        customerPhone: p.phone,
        clientPhoneType: p.type,
        extension: Math.floor(1000 + Math.random() * 9000).toString(),
        companyId: job.companyId,
      },
    });
  }
}