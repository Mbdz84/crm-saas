import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { signAuthToken, setAuthCookie } from "../lib/authCookie";

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

    // Sliding session: if this token is more than a day old, quietly re-issue
    // a fresh 30-day cookie so active users never get logged out. Wrapped so a
    // refresh hiccup can never block the request.
    try {
      const nowSec = Math.floor(Date.now() / 1000);
      const ageSec = nowSec - (decoded.iat || nowSec);
      if (ageSec > 24 * 60 * 60) {
        setAuthCookie(
          req,
          res,
          signAuthToken({
            userId: decoded.userId,
            companyId: decoded.companyId,
            role: decoded.role,
          })
        );
      }
    } catch {
      /* never block a request on cookie refresh */
    }

    next();
  } catch (err: any) {
    console.error("❌ AUTH ERROR:", err?.name, err?.message);
    return res.status(401).json({ error: "Invalid token" });
  }
}