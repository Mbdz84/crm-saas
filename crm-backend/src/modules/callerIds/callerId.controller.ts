import { Request, Response } from "express";
import prisma from "../../prisma/client";

// Match the frontend: compare on the last 10 digits.
function normalize(phone?: string): string {
  return (phone || "").replace(/[^\d]/g, "").slice(-10);
}

/* GET /caller-ids → list for the company */
export async function getCallerIds(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const list = await prisma.callerId.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });
    return res.json(list);
  } catch (err) {
    console.error("🔥 getCallerIds error:", err);
    return res.status(500).json({ error: "Failed to load caller IDs" });
  }
}

/* POST /caller-ids { number, name } → create/update by number */
export async function createCallerId(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const number = normalize(req.body?.number);
    const name = (req.body?.name || "").trim();

    if (!number || number.length < 10)
      return res.status(400).json({ error: "Valid phone number required" });
    if (!name) return res.status(400).json({ error: "Name required" });

    const entry = await prisma.callerId.upsert({
      where: { companyId_number: { companyId, number } },
      create: { companyId, number, name },
      update: { name },
    });
    return res.json(entry);
  } catch (err) {
    console.error("🔥 createCallerId error:", err);
    return res.status(500).json({ error: "Failed to save caller ID" });
  }
}

/* PUT /caller-ids/:id { number?, name? } */
export async function updateCallerId(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const { id } = req.params;

    const existing = await prisma.callerId.findFirst({
      where: { id, companyId },
    });
    if (!existing) return res.status(404).json({ error: "Not found" });

    const data: { number?: string; name?: string } = {};
    if (req.body?.number !== undefined) {
      const n = normalize(req.body.number);
      if (!n || n.length < 10)
        return res.status(400).json({ error: "Valid phone number required" });
      data.number = n;
    }
    if (req.body?.name !== undefined) {
      const name = (req.body.name || "").trim();
      if (!name) return res.status(400).json({ error: "Name required" });
      data.name = name;
    }

    const updated = await prisma.callerId.update({ where: { id }, data });
    return res.json(updated);
  } catch (err) {
    console.error("🔥 updateCallerId error:", err);
    return res.status(500).json({ error: "Failed to update caller ID" });
  }
}

/* DELETE /caller-ids/:id */
export async function deleteCallerId(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const { id } = req.params;
    const existing = await prisma.callerId.findFirst({
      where: { id, companyId },
    });
    if (!existing) return res.status(404).json({ error: "Not found" });

    await prisma.callerId.delete({ where: { id } });
    return res.json({ message: "Deleted" });
  } catch (err) {
    console.error("🔥 deleteCallerId error:", err);
    return res.status(500).json({ error: "Failed to delete caller ID" });
  }
}
