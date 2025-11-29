import { Request, Response } from "express";
import prisma from "../../prisma/client";
import bcrypt from "bcryptjs";

/* ============================================================
    LIST TECHNICIANS
============================================================ */
export async function getTechnicians(req: Request, res: Response) {
  try {
    const techs = await prisma.user.findMany({
      where: {
        companyId: req.user!.companyId,
        role: "technician",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        active: true,
        maskedCalls: true,   // ⭐ NEW
        createdAt: true,
      },
    });

    res.json(techs);
  } catch (err) {
    console.error("🔥 GET TECHNICIANS ERROR:", err);
    res.status(500).json({ error: "Failed to load technicians" });
  }
}

/* ============================================================
    CREATE TECHNICIAN
============================================================ */
export async function createTechnician(req: Request, res: Response) {
  try {
    const { email, password, name, phone, maskedCalls } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const tech = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        phone: phone ? phone.toString() : null,
        role: "technician",
        active: true,
        maskedCalls: Boolean(maskedCalls),   // ⭐ NEW
        companyId: req.user!.companyId,
      },
    });

    res.json({ message: "Technician created", tech });
  } catch (err) {
    console.error("🔥 CREATE TECH ERROR:", err);
    res.status(500).json({ error: "Failed to create technician" });
  }
}

/* ============================================================
    UPDATE TECHNICIAN
============================================================ */
export async function updateTechnician(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const { name, phone, active, maskedCalls } = req.body;

    console.log("➡️ UPDATE TECH BODY:", req.body);

    const updated = await prisma.user.update({
      where: {
        id,
        companyId: req.user!.companyId,
        role: "technician",
      },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone: phone.toString() } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
        ...(maskedCalls !== undefined
          ? { maskedCalls: Boolean(maskedCalls) }
          : {}), // ⭐ NEW
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        active: true,
        maskedCalls: true, // ⭐ NEW
        createdAt: true,
      },
    });

    res.json({ message: "Technician updated", tech: updated });
  } catch (err) {
    console.error("🔥 UPDATE TECH ERROR:", err);
    res.status(500).json({ error: "Failed to update technician" });
  }
}

/* ============================================================
    TOGGLE ACTIVE STATUS
============================================================ */
export async function toggleTechnicianStatus(req: Request, res: Response) {
  try {
    const id = req.params.id;

    const tech = await prisma.user.findFirst({
      where: { id, companyId: req.user!.companyId, role: "technician" },
    });

    if (!tech) {
      return res.status(404).json({ error: "Technician not found" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { active: !tech.active },
    });

    res.json(updated);
  } catch (err) {
    console.error("🔥 TOGGLE TECH ERROR:", err);
    res.status(500).json({ error: "Failed to toggle technician" });
  }
}

/* ============================================================
    DELETE TECHNICIAN
============================================================ */
export async function deleteTechnician(req: Request, res: Response) {
  try {
    const id = req.params.id;

    await prisma.user.delete({
      where: {
        id,
        companyId: req.user!.companyId,
        role: "technician",
      },
    });

    res.json({ message: "Technician deleted" });
  } catch (err) {
    console.error("🔥 DELETE TECH ERROR:", err);
    res.status(500).json({ error: "Failed to delete technician" });
  }
}

/* ============================================================
    GET SINGLE TECHNICIAN
============================================================ */
export async function getTechnicianById(req: Request, res: Response) {
  try {
    const id = req.params.id;

    const tech = await prisma.user.findFirst({
      where: {
        id,
        role: "technician",
        companyId: req.user!.companyId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        active: true,
        maskedCalls: true,   // ⭐ NEW
        createdAt: true,
      },
    });

    if (!tech) return res.status(404).json({ error: "Technician not found" });

    res.json(tech);
  } catch (err) {
    console.error("🔥 GET TECHNICIAN ERROR:", err);
    res.status(500).json({ error: "Failed to load technician" });
  }
}