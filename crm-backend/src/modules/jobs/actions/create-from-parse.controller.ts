import { Request, Response } from "express";
import prisma from "../../../prisma/client";
import { logJobEvent } from "../../../utils/jobLogger";
import { attachPendingCallsToJob } from "../../incomingCall/incomingCall.service";
import { resolveTimezoneForJob } from "../../../utils/timezone";

/* ------------------------------------------
   Generate 5-char uppercase Job ID
------------------------------------------ */
function generateShortId() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

/**
 * Create job from parsed AI fields
 * Route: POST /jobs/create-from-parse
 */
export async function createJobFromParse(req: Request, res: Response) {
  console.log("🚨 createJobFromParse HIT");
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const companyId = req.user.companyId;

    const {
      title,
      description,
      customerName,
      customerPhone,
      customerPhone2,
      customerAddress,
      jobType,
      jobTypeId,
      source,
      technicianId,
      leadSourceId, // ⭐ This now overrides AI
      scheduledAt,
      __rawText,
    } = req.body;

    /* ------------------------------------------
       1) Determine Job Type ID
    ------------------------------------------ */
    let finalJobTypeId: string | null = null;

    if (jobTypeId) {
      finalJobTypeId = jobTypeId;
    } else if (jobType) {
      const match = await prisma.jobType.findFirst({
        where: { companyId, name: jobType },
      });

      if (match) {
        finalJobTypeId = match.id;
      } else {
        const created = await prisma.jobType.create({
          data: { companyId, name: jobType, active: true },
        });
        finalJobTypeId = created.id;
      }
    }

    /* ------------------------------------------
       2) Determine Lead Source
    ------------------------------------------ */
    let finalSourceId: string | null = null;

    const hasUiLeadSource = leadSourceId && leadSourceId.trim() !== "";

    if (hasUiLeadSource) {
      finalSourceId = leadSourceId;
    } else if (source) {
      const match = await prisma.leadSource.findFirst({
        where: { companyId, name: source },
      });

      if (match) {
        finalSourceId = match.id;
      } else {
        const created = await prisma.leadSource.create({
          data: { companyId, name: source },
        });
        finalSourceId = created.id;
      }
    }

    /* ------------------------------------------
       3) Find Accepted status (CRITICAL FIX)
    ------------------------------------------ */
    const acceptedStatus = await prisma.jobStatus.findFirst({
      where: {
        name: "Accepted",
        active: true,
      },
    });

    if (!acceptedStatus) {
      throw new Error("Accepted status not found");
    }

    /* ------------------------------------------
       4) CREATE JOB
    ------------------------------------------ */
    console.log("📨 CREATE FROM PARSE BODY:", req.body);

    const timezone = await resolveTimezoneForJob(
      companyId,
      customerAddress,
      technicianId
    );

    const job = await prisma.job.create({
      data: {
        shortId: generateShortId(),

        title: title || description || "New Job",
        description: description || null,

        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerPhone2: customerPhone2 || null,
        customerAddress: customerAddress || null,
        timezone,

        jobTypeId: finalJobTypeId,
        technicianId: technicianId || null,
        sourceId: finalSourceId,

        // ✅ FIXED
        statusId: acceptedStatus.id,
        status: acceptedStatus.name,

        companyId,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    /* ------------------------------------------
       5) Optional: save raw text into job logs
    ------------------------------------------ */
    if (__rawText) {
      await prisma.jobLog.create({
        data: {
          jobId: job.id,
          userId: req.user.id,
          type: "parse",
          text: __rawText,
        },
      });
    }

    /* ------------------------------------------
       6) Log the selected lead source & technician
    ------------------------------------------ */
    if (finalSourceId) {
      const lead = await prisma.leadSource.findUnique({
        where: { id: finalSourceId },
        select: { name: true },
      });
      if (lead) {
        await logJobEvent({
          jobId: job.id,
          type: "system",
          text: `Lead source: ${lead.name}`,
          userId: req.user.id,
        });
      }
    }

    if (technicianId) {
      const tech = await prisma.user.findUnique({
        where: { id: technicianId },
        select: { name: true },
      });
      if (tech) {
        await logJobEvent({
          jobId: job.id,
          type: "assigned_technician",
          text: `Technician assigned: ${tech.name}`,
          userId: req.user.id,
        });
      }
    }

    await attachPendingCallsToJob(job);

    return res.json({
      message: "Job created from parsed text",
      id: job.id,
      shortId: job.shortId,
      job,
    });

  } catch (err) {
    console.error("createJobFromParse error:", err);
    return res
      .status(500)
      .json({ error: "Failed to create job from parsed text" });
  }
}