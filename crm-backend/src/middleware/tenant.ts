import { Request, Response, NextFunction } from "express";

export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.companyId) {
    return res.status(400).json({ error: "Tenant not found" });
  }

  req.tenantId = req.user.companyId;
  next();
}