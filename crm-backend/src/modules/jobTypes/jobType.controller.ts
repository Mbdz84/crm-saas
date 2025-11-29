import { Request, Response } from "express";
import prisma from "../../prisma/client";

// GET /job-types
export async function getJobTypes(req: Request, res: Response) {
  try {
    const jobTypes = await prisma.jobType.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { name: "asc" },
    });

    res.json(jobTypes);
  } catch (err) {
    console.error("🔥 LIST JOB TYPES ERROR:", err);
    res.status(500).json({ error: "Failed to load job types" });
  }
}

// POST /job-types
export async function createJobType(req: Request, res: Response) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    const jobType = await prisma.jobType.create({
      data: {
        name: name.trim(),
        companyId: req.user!.companyId,
      },
    });

    res.json({ message: "Job type created", jobType });
  } catch (err) {
    console.error("🔥 CREATE JOB TYPE ERROR:", err);
    res.status(500).json({ error: "Failed to create job type" });
  }
}

// PUT /job-types/:id
export async function updateJobType(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, active } = req.body;

    const jobType = await prisma.jobType.update({
      where: {
        id,
      },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
      },
    });

    res.json({ message: "Job type updated", jobType });
  } catch (err) {
    console.error("🔥 UPDATE JOB TYPE ERROR:", err);
    res.status(500).json({ error: "Failed to update job type" });
  }
}

// DELETE /job-types/:id
export async function deleteJobType(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.jobType.delete({
      where: { id },
    });

    res.json({ message: "Job type deleted" });
  } catch (err) {
    console.error("🔥 DELETE JOB TYPE ERROR:", err);
    res.status(500).json({ error: "Failed to delete job type" });
  }
}