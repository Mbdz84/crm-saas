import { Request, Response } from "express";
import prisma from "../../prisma/client";
import bcrypt from "bcryptjs";
import { signAuthToken, setAuthCookie } from "../../lib/authCookie";

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name, companyName } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const company = await prisma.company.create({
      data: { name: companyName },
    });

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        role: "admin",
        companyId: company.id,
      },
    });

    return res.json({ message: "Registration successful", user, company });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) return res.status(400).json({ error: "Invalid email" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid password" });

    // Per-user login switch ("Active User"). Admins/owners always keep access
    // (they bypass permission flags); only non-privileged users are gated,
    // so an accidental toggle can never lock the company out of its own admin.
    const isPrivileged = user.role === "admin" || user.isOwner === true;
    if (!isPrivileged && user.canLogin === false) {
      return res.status(403).json({
        error: "This account is not allowed to sign in. Contact your administrator.",
      });
    }

    // 30-day sliding session — refreshed on every authenticated request
    // (see authMiddleware) so active users stay logged in.
    const token = signAuthToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    });
    setAuthCookie(req, res, token);

    return res.json({ message: "Logged in", user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
}

/* --------------------------------------------------------
   AUTH ME (RETURN FULL USER DATA)
-------------------------------------------------------- */
export async function me(req: Request, res: Response) {
  try {
    // req.user.id comes from authMiddleware
    if (!req.user?.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        canViewAllJobs: true,
        canSeeClientPhone: true,
        canSeeLogs: true,
        canSeeRecordings: true,
        canSeeReports: true,
        canUseCalendar: true,
        canSeeDashboard: true,
        canUseChat: true,
        canSeeSearch: true,
        canCreateJob: true,
      },
    });

    if (!fullUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user: fullUser });
  } catch (err) {
    console.error("me() error:", err);
    res.status(500).json({ error: "Failed to load user" });
  }
}