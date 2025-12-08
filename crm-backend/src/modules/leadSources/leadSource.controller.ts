import { Request, Response } from "express";
import prisma from "../../prisma/client";

/* ============================================================
   GET ALL LEAD SOURCES
============================================================ */
export async function getLeadSources(req: Request, res: Response) {
  try {
    const sources = await prisma.leadSource.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { name: "asc" },
    });

    res.json(sources);
  } catch (err) {
    console.error("🔥 GET LEAD SOURCES ERROR:", err);
    res.status(500).json({ error: "Failed to load lead sources" });
  }
}

/* ============================================================
   GET ONE LEAD SOURCE
============================================================ */
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

/* ============================================================
   CREATE LEAD SOURCE
============================================================ */
export async function createLeadSource(req: Request, res: Response) {
  try {
    const {
      name,
      color,
      active,
      locked,
      defaultLeadPercent,
      defaultAdditionalFee,
      defaultCcFeePercent,
      defaultCheckFeePercent,
      autoApplyFinancialRules,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    const source = await prisma.leadSource.create({
      data: {
        name: name.trim(),
        companyId: req.user!.companyId,

        color: color ?? "#6b7280",
        active: active ?? true,
        locked: locked ?? false,

        /* Convert to number instead of Prisma.Decimal */
        defaultLeadPercent:
          defaultLeadPercent !== undefined && defaultLeadPercent !== null
            ? Number(defaultLeadPercent)
            : undefined,

        defaultAdditionalFee:
          defaultAdditionalFee !== undefined && defaultAdditionalFee !== null
            ? Number(defaultAdditionalFee)
            : undefined,

        defaultCcFeePercent:
          defaultCcFeePercent !== undefined && defaultCcFeePercent !== null
            ? Number(defaultCcFeePercent)
            : undefined,

        defaultCheckFeePercent:
          defaultCheckFeePercent !== undefined && defaultCheckFeePercent !== null
            ? Number(defaultCheckFeePercent)
            : undefined,

        autoApplyFinancialRules: autoApplyFinancialRules ?? false,
      },
    });

    res.json(source);
  } catch (err) {
    console.error("🔥 CREATE LEAD SOURCE ERROR:", err);
    res.status(500).json({ error: "Failed to create lead source" });
  }
}

/* ============================================================
   UPDATE LEAD SOURCE
============================================================ */
export async function updateLeadSource(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      name,
      color,
      active,
      locked,
      defaultLeadPercent,
      defaultAdditionalFee,
      defaultCcFeePercent,
      defaultCheckFeePercent,
      autoApplyFinancialRules,
    } = req.body;

    const data: any = {};

    if (name !== undefined) data.name = name.trim();
    if (color !== undefined) data.color = color;
    if (active !== undefined) data.active = active;
    if (locked !== undefined) data.locked = locked;
    if (autoApplyFinancialRules !== undefined)
      data.autoApplyFinancialRules = autoApplyFinancialRules;

    // 🟦 Convert all decimals to plain numbers
    if (defaultLeadPercent !== undefined) {
      data.defaultLeadPercent =
        defaultLeadPercent === null ? null : Number(defaultLeadPercent);
    }

    if (defaultAdditionalFee !== undefined) {
      data.defaultAdditionalFee =
        defaultAdditionalFee === null ? null : Number(defaultAdditionalFee);
    }

    if (defaultCcFeePercent !== undefined) {
      data.defaultCcFeePercent =
        defaultCcFeePercent === null ? null : Number(defaultCcFeePercent);
    }

    if (defaultCheckFeePercent !== undefined) {
      data.defaultCheckFeePercent =
        defaultCheckFeePercent === null ? null : Number(defaultCheckFeePercent);
    }

    const source = await prisma.leadSource.update({
      where: { id },
      data,
    });

    return res.json({ message: "Updated", source });
  } catch (err) {
    console.error("🔥 UPDATE LEAD SOURCE ERROR:", err);
    res.status(500).json({ error: "Failed to update lead source" });
  }
}

/* ============================================================
   DELETE LEAD SOURCE
============================================================ */
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