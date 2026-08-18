import { Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

/* ============================================================
   AUTH SESSION / COOKIE
   One place that defines how long a login lasts and how the
   auth cookie is written, so login + refresh never drift apart.

   The session is a SLIDING window: authMiddleware re-issues the
   cookie on use (see middleware/auth.ts), so an active user
   effectively stays logged in forever. Only a user who doesn't
   open the app for the full window below gets signed out.
============================================================ */

export const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

export function signAuthToken(payload: {
  userId: string;
  companyId: string;
  role: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${SESSION_DAYS}d` });
}

export function setAuthCookie(req: Request, res: Response, token: string): void {
  // Same local/prod detection the login + logout routes already use.
  const isLocal =
    req.hostname === "localhost" ||
    req.hostname.startsWith("127.") ||
    req.hostname.startsWith("10.") ||
    req.hostname.startsWith("192.168.");

  res.cookie("token", token, {
    httpOnly: true,
    secure: !isLocal, // prod → true
    sameSite: isLocal ? "lax" : "none", // prod → none (cross-subdomain)
    domain: isLocal ? undefined : ".moriel.work",
    path: "/",
    maxAge: SESSION_MS, // <-- gives the cookie a real lifetime (was a
    // session cookie before, so phones dropped it on app close)
  });
}
