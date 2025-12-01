import { Request, Response } from "express";
import prisma from "../../../prisma/client";
import { generateUniqueShortId } from "../utils/shortId";
import { sendTechSms } from "./sms.controller";

export async function createJob(req: Request, res: Response) {
  try {
    const {
      title,
      description,
      customerName,
      customerPhone,
      customerAddress,
      jobTypeId,
      technicianId,
      scheduledAt,
      status,
      sendSmsToTech,
      sourceId,
    } = req.body;

    const shortId = await generateUniqueShortId();

    const jtName = jobTypeId
      ? await prisma.jobType.findUnique({ where: { id: jobTypeId } })
          .then((jt: any) => jt?.name || "")
      : "";

    const finalTitle =
      title ||
      (customerName
        ? `${customerName}${jtName ? " - " + jtName : ""}`
        : "New Job");

    const job = await prisma.job.create({
      data: {
        shortId,
        title: finalTitle,
        description,
        customerName,
        customerPhone,
        customerAddress,
        jobTypeId: jobTypeId || null,
        technicianId: technicianId || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: status || "Accepted",
        sourceId: sourceId || null,
        companyId: req.user!.companyId,
      },
      include: {
        technician: true,
        jobType: true,
        source: true,
        jobStatus: true,
      },
    });

    if (sendSmsToTech && technicianId) {
      await sendTechSms(technicianId, job);
    }

    return res.json({ message: "Job created", job });
  } catch (err) {
    console.error("createJob error:", err);
    return res.status(500).json({ error: "Failed to create job" });
  }
}

// AI-created jobs
export async function createJobFromParsed(req: Request, res: Response) {
  try {
    const {
      customerName,
      customerPhone,
      customerAddress,
      jobType,
      description,
      source,
    } = req.body;

    const user = req.user;
    if (!user?.companyId)
      return res.status(401).json({ error: "Unauthorized" });

    const companyId = user.companyId;

    const shortId = await generateUniqueShortId();

    // Job type lookup
    let jobTypeId: string | null = null;
    if (jobType) {
      const jt = await prisma.jobType.findFirst({
        where: { name: jobType.trim(), companyId },
      });
      jobTypeId = jt?.id || null;
    }

    // Lead source lookup
    let sourceId: string | null = null;
    if (source) {
      const ls = await prisma.leadSource.findFirst({
        where: { name: source.trim(), companyId },
      });
      sourceId = ls?.id || (
        await prisma.leadSource.create({
          data: { name: source.trim(), companyId },
        })
      ).id;
    }

    const title =
      customerName && jobType
        ? `${customerName} - ${jobType}`
        : customerName || jobType || "New Job";

    const job = await prisma.job.create({
      data: {
        shortId,
        title,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerAddress: customerAddress || null,
        description: description || null,
        jobTypeId,
        sourceId,
        technicianId: null,
        scheduledAt: null,
        status: "Accepted",
        companyId,
      },
      include: {
        technician: true,
        jobType: true,
        source: true,
        jobStatus: true,
      },
    });

    if (req.body.__rawText) {
      await prisma.jobLog.create({
        data: {
          jobId: job.id,
          type: "parsed_sms",
          text: req.body.__rawText,
          userId: req.user!.id,
        },
      });
    }

    return res.json({ message: "Job created", job, shortId });
  } catch (err) {
    console.error("createJobFromParsed error:", err);
    return res.status(500).json({ error: "Failed to create parsed job" });
  }
}
