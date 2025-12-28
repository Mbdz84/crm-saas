import { Request, Response, NextFunction } from "express";
import prisma from "../prisma/client";
import { hashApiKey } from "../utils/apiKey";

export async function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing API key" });
  }

  const rawKey = auth.replace("Bearer ", "").trim();
  const hashed = hashApiKey(rawKey);

  const leadSource = await prisma.leadSource.findFirst({
    where: { apiKeyHash: hashed, active: true },
    include: { company: true },
  });

  if (!leadSource) {
    return res.status(401).json({ error: "Invalid API key" });
  }

  // Attach context
  (req as any).leadSource = leadSource;
  (req as any).company = leadSource.company;

  next();
}