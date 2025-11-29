import { Request, Response } from "express";
import prisma from "../../prisma/client";
import bcrypt from "bcryptjs";

// GET users for current company
export async function getUsers(req: Request, res: Response) {
  const users = await prisma.user.findMany({
    where: { companyId: req.user!.companyId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  res.json(users);
}

// CREATE user
export async function createUser(req: Request, res: Response) {
  try {
    console.log("CREATE USER BODY:", req.body);
    const { name, email, password, role } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    if (!password || password.trim() === "") {
      return res.status(400).json({ error: "Password is required" });
    }

    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role,
        active: true,
        companyId: req.user!.companyId,
      },
    });

    return res.json({ message: "User created", user });

  } catch (err: any) {
    console.error("🔥 CREATE USER ERROR:", err);

    // Prisma duplicate email
    if (err.code === "P2002" && err.meta?.target?.includes("email")) {
      return res
        .status(400)
        .json({ error: "Email already exists. Choose another." });
    }

    return res.status(500).json({ error: "Failed to create user" });
  }
}

// CREATE technician
export async function createTechnician(req: Request, res: Response) {
  try {
    console.log("CREATE USER BODY:", req.body);
    const { name, email, phone } = req.body;

    const tech = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: "temp123",
        role: "technician",
        active: true,
        companyId: req.user!.companyId,
      },
    });

    return res.json(tech);

  } catch (err: any) {
    console.error("🔥 CREATE TECH ERROR:", err);

    // 🟥 Prisma P2002 duplicate email
    if (err.code === "P2002" && err.meta?.target?.includes("email")) {
      return res.status(400).json({
        error: "Email already exists. Choose another email.",
      });
    }

    return res.status(500).json({ error: "Failed to create technician" });
  }
}

// UPDATE role
export async function updateRole(req: Request, res: Response) {
  const { role } = req.body;

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
  });

  res.json({ message: "Role updated", user });
}

// ACTIVATE / DEACTIVATE user
export async function toggleActive(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
  });

  if (!user) return res.status(404).json({ error: "User not found" });

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      active: !user.active,
    },
  });

  res.json({ message: "User status updated", user: updated });
}

// updae technician
export async function updateTechnician(req: Request, res: Response) {
  const id = req.params.id;
  const { name, phone, email, active } = req.body;

  try {
    const tech = await prisma.user.update({
      where: { id },
      data: { name, phone, email, active },
    });

    res.json(tech);
  } catch (err) {
    console.log("UPDATE TECH ERROR:", err);
    res.status(500).json({ error: "Failed to update" });
  }
}

// delete technician
export async function deleteTechnician(req: Request, res: Response) {
  try {
    const id = req.params.id;

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: "Technician deleted" });
  } catch (err) {
    console.error("🔥 DELETE TECH ERROR", err);
    res.status(500).json({ error: "Failed to delete technician" });
  }
}

// GET SINGLE TECHNICIAN
export async function getTechnician(req: Request, res: Response) {
  try {
    const id = req.params.id;

    const tech = await prisma.user.findFirst({
      where: {
        id,
        companyId: req.user!.companyId,
        role: "technician",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        active: true,
        createdAt: true,
      },
    });

    if (!tech) {
      return res.status(404).json({ error: "Technician not found" });
    }

    res.json(tech);
  } catch (err) {
    console.error("🔥 GET TECH ERROR:", err);
    res.status(500).json({ error: "Failed to load technician" });
  }
}

// get user
export async function getUserById(req: Request, res: Response) {
  try {
    const id = req.params.id;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("🔥 GET USER ERROR:", err);
    res.status(500).json({ error: "Failed to load user" });
  }
}

// update user
export async function updateUser(req: Request, res: Response) {
  try {
    const id = req.params.id;

    const { name, email, role, active } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
        active: active ?? true,
      },
    });

    res.json(user);
  } catch (err) {
    console.error("🔥 UPDATE USER ERROR:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
}

//user toggle
export async function toggleTechnician(req: Request, res: Response) {
  try {
    const id = req.params.id;

    const tech = await prisma.user.findUnique({
      where: { id },
    });

    if (!tech) {
      return res.status(404).json({ error: "Technician not found" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { active: !tech.active },
    });

    res.json(updated);
  } catch (err) {
    console.error("🔥 TOGGLE TECH ERROR:", err);
    res.status(500).json({ error: "Failed to toggle technician" });
  }
}