import { Request, Response } from "express";
import prisma from "../../prisma/client";

// GET all lead sources
export async function getLeadSources(req: Request, res: Response) {
  try {
    const sources = await prisma.leadSource.findMany({
      where: {
        companyId: req.user!.companyId,
      },
      orderBy: { name: "asc" },
    });

    res.json(sources);
  } catch (err) {
    console.error("🔥 GET LEAD SOURCES ERROR:", err);
    res.status(500).json({ error: "Failed to load lead sources" });
  }
}

// GET one lead source by ID
export async function getLeadSourceById(req: Request, res: Response) {
  try {
    const source = await prisma.leadSource.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user!.companyId,
      },
    });

    if (!source) return res.status(404).json({ error: "Lead source not found" });

    res.json(source);
  } catch (err) {
    console.error("🔥 GET LEAD SOURCE ERROR:", err);
    res.status(500).json({ error: "Failed to load lead source" });
  }
}

// CREATE
export async function createLeadSource(req: Request, res: Response) {
  try {
    const { name } = req.body;

    const newSource = await prisma.leadSource.create({
      data: {
        name,
        companyId: req.user!.companyId,
      },
    });

    res.json(newSource);
  } catch (err) {
    console.error("🔥 CREATE LEAD SOURCE ERROR:", err);
    res.status(500).json({ error: "Failed to create lead source" });
  }
}

// UPDATE
export async function updateLeadSource(req: Request, res: Response) {
  try {
    const { name } = req.body;

    const updated = await prisma.leadSource.update({
      where: { id: req.params.id },
      data: { name },
    });

    res.json(updated);
  } catch (err) {
    console.error("🔥 UPDATE LEAD SOURCE ERROR:", err);
    res.status(500).json({ error: "Failed to update lead source" });
  }
}

// DELETE
export async function deleteLeadSource(req: Request, res: Response) {
  try {
    await prisma.leadSource.delete({
      where: { id: req.params.id },
    });

    res.json({ message: "Lead source deleted" });
  } catch (err) {
    console.error("🔥 DELETE LEAD SOURCE ERROR:", err);
    res.status(500).json({ error: "Failed to delete lead source" });
  }
}