import { Request, Response } from "express";
import prisma from "../../prisma/client";

/* ===========================================
   GET ALL STATUSES
=========================================== */
export async function getStatuses(req: Request, res: Response) {
  try {
    const statuses = await prisma.jobStatus.findMany({
      orderBy: { order: "asc" },
    });

    return res.json(statuses);
  } catch (err) {
    console.error("🔥 GET STATUSES ERROR:", err);
    return res.status(500).json({ error: "Failed to load statuses" });
  }
}

/* ===========================================
   CREATE STATUS
=========================================== */
export async function createStatus(req: Request, res: Response) {
  try {
    const { name, order, active, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    const status = await prisma.jobStatus.create({
      data: {
        name: name.trim(),
        order: order ?? 0,
        active: active ?? true,
        color: color ?? "#6b7280",
        locked: false,
      },
    });

    return res.json({ message: "Status created", status });
  } catch (err) {
    console.error("🔥 CREATE STATUS ERROR:", err);
    return res.status(500).json({ error: "Failed to create status" });
  }
}

/* ===========================================
   UPDATE STATUS
=========================================== */
export async function updateStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, active, order, color } = req.body;

    const status = await prisma.jobStatus.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(active !== undefined ? { active } : {}),
        ...(order !== undefined ? { order } : {}),
      },
    });

    return res.json({ message: "Updated", status });
  } catch (err) {
    console.error("🔥 UPDATE STATUS ERROR:", err);
    return res.status(500).json({ error: "Failed to update status" });
  }
}

/* ===========================================
   DELETE STATUS
=========================================== */
export async function deleteStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.jobStatus.delete({
      where: { id },
    });

    return res.json({ message: "Deleted" });
  } catch (err) {
    console.error("🔥 DELETE STATUS ERROR:", err);
    return res.status(500).json({ error: "Failed to delete status" });
  }
}

/* ===========================================
   DRAG & DROP REORDER
=========================================== */
export async function reorderStatuses(req: Request, res: Response) {
  try {
    const { order } = req.body;

    if (!Array.isArray(order)) {
      return res.status(400).json({ error: "Invalid order array" });
    }

    await Promise.all(
      order.map((s) =>
        prisma.jobStatus.update({
          where: { id: s.id },
          data: { order: s.order },
        })
      )
    );

    return res.json({ message: "Order updated" });
  } catch (err) {
    console.error("🔥 REORDER ERROR:", err);
    return res.status(500).json({ error: "Failed to reorder statuses" });
  }
}

/* ===========================================
   LOCK / UNLOCK (Admin only)
=========================================== */
export async function lockStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.jobStatus.update({
      where: { id },
      data: { locked: true },
    });

    return res.json({ message: "Locked" });
  } catch (err) {
    console.error("🔥 LOCK ERROR:", err);
    return res.status(500).json({ error: "Failed to lock status" });
  }
}

export async function unlockStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.jobStatus.update({
      where: { id },
      data: { locked: false },
    });

    return res.json({ message: "Unlocked" });
  } catch (err) {
    console.error("🔥 UNLOCK ERROR:", err);
    return res.status(500).json({ error: "Failed to unlock status" });
  }
}