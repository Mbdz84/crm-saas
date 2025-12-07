import { Request, Response } from "express";
import prisma from "../../prisma/client";
import { Prisma } from "@prisma/client";

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

    defaultLeadPercent:
      defaultLeadPercent !== undefined && defaultLeadPercent !== null
        ? new Prisma.Decimal(defaultLeadPercent)
        : undefined,

    defaultAdditionalFee:
      defaultAdditionalFee !== undefined && defaultAdditionalFee !== null
        ? new Prisma.Decimal(defaultAdditionalFee)
        : undefined,

    defaultCcFeePercent:
      defaultCcFeePercent !== undefined && defaultCcFeePercent !== null
        ? new Prisma.Decimal(defaultCcFeePercent)
        : undefined,

    defaultCheckFeePercent:
      defaultCheckFeePercent !== undefined && defaultCheckFeePercent !== null
        ? new Prisma.Decimal(defaultCheckFeePercent)
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

// UPDATE
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

if (defaultLeadPercent !== undefined) {
  data.defaultLeadPercent =
    defaultLeadPercent === null
      ? null
      : new Prisma.Decimal(defaultLeadPercent);
}
if (defaultAdditionalFee !== undefined) {
  data.defaultAdditionalFee =
    defaultAdditionalFee === null
      ? null
      : new Prisma.Decimal(defaultAdditionalFee);
}
if (defaultCcFeePercent !== undefined) {
  data.defaultCcFeePercent =
    defaultCcFeePercent === null
      ? null
      : new Prisma.Decimal(defaultCcFeePercent);
}
if (defaultCheckFeePercent !== undefined) {
  data.defaultCheckFeePercent =
    defaultCheckFeePercent === null
      ? null
      : new Prisma.Decimal(defaultCheckFeePercent);
}

const source = await prisma.leadSource.update({
  where: {
    id,
    // optional safety:
    // companyId: req.user!.companyId
  },
  data,
});

return res.json({ message: "Updated", source });

    res.json(source);
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