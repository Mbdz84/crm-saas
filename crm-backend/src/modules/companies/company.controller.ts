import { Request, Response } from "express";
import prisma from "../../prisma/client";

export async function getCompany(req: Request, res: Response) {
  const company = await prisma.company.findUnique({
    where: { id: req.user!.companyId },
  });

  res.json(company);
}

export async function updateCompany(req: Request, res: Response) {
  try {
    const { name, domain, address, logoUrl, phone, invoiceDescriptions } =
      req.body;

    const data: any = { name, domain, address, logoUrl };
    if (phone !== undefined) data.phone = phone;
    if (invoiceDescriptions !== undefined) {
      data.invoiceDescriptions = Array.isArray(invoiceDescriptions)
        ? invoiceDescriptions.map((d: string) => String(d).trim()).filter(Boolean)
        : [];
    }

    const updated = await prisma.company.update({
      where: { id: req.user!.companyId },
      data,
    });

    res.json({ message: "Company updated", company: updated });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
}