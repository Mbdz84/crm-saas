import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  
  const token = req.cookies.token;

  if (!token) {
    console.log("❌ No token found → Unauthorized");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    req.user = {
      id: decoded.userId,
      companyId: decoded.companyId,
      role: decoded.role,
    };

    next();
  } catch (err: any) {
    console.error("❌ AUTH ERROR:", err?.name, err?.message);
    console.error("❌ TOKEN USED:", token);
    return res.status(401).json({ error: "Invalid token" });
  }
}