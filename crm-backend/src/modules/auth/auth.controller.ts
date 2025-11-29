import { Request, Response } from "express";
import prisma from "../../prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

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

    const token = jwt.sign(
      { userId: user.id, companyId: user.companyId, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Determine cookie domain dynamically for local dev
const domain =
  req.hostname === "localhost" ||
  req.hostname.startsWith("127.") ||
  req.hostname.startsWith("10.") ||
  req.hostname.startsWith("192.168.")
    ? undefined
    : req.hostname;

res.cookie("token", token, {
  httpOnly: true,
  secure: false,     // HTTPS → true, local → false
  sameSite: "lax",   // Lax works with same-host navigation
  path: "/",
});

    res.json({ message: "Logged in", user });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
}

export async function me(req: Request, res: Response) {
  res.json({ user: req.user });
}