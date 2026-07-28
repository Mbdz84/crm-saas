import { Request, Response } from "express";
import prisma from "../../prisma/client";

/* ============================================================
   SAFE GET COMPANY (NEVER RETURNS NULL)
============================================================ */
export async function getCompany(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;

    let company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    // ❗ If company is missing → Create default company record
    if (!company) {
      company = await prisma.company.create({
        data: {
          id: companyId,
          name: "New Company",
          phone: "",
          address: "",
          logoUrl: "",
          smsSettings: {}, // safe empty JSON object
        },
      });
    }

    return res.json(company);
  } catch (err) {
    console.error("🔥 GET COMPANY ERROR:", err);
    return res
      .status(500)
      .json({ error: "Failed to load company profile" });
  }
}

/* ============================================================
   UPDATE COMPANY
============================================================ */
export async function updateCompany(req: Request, res: Response) {
  try {
    const companyId = req.user!.companyId;
    const { name, phone, address, logoUrl } = req.body;

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        name,
        phone,
        address,
        // Only touch logoUrl when the client sends it (string, incl. "" to clear)
        ...(logoUrl !== undefined ? { logoUrl } : {}),
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error("⚠ SETTINGS UPDATE ERROR:", err);
    return res
      .status(500)
      .json({ error: "Failed to update company settings" });
  }
}

/* ============================================================
   UPLOAD LOGO
============================================================ */
export async function uploadLogo(req: Request, res: Response) {
  try {
    if (!req.file)
      return res.status(400).json({ error: "No file uploaded" });

    const companyId = req.user!.companyId;

    const logoUrl = `${process.env.BASE_URL}/uploads/${req.file.filename}`;

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: { logoUrl },
    });

    return res.json(updated);
  } catch (err) {
    console.error("⚠ LOGO UPLOAD ERROR:", err);
    return res.status(500).json({ error: "Failed to upload logo" });
  }
}