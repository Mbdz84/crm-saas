import { Router } from "express";
import { register, login, me } from "./auth.controller";
import { authMiddleware } from "../../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);

// ⭐ NEW — LOGOUT ENDPOINT
router.post("/logout", (req, res) => {
  res.clearCookie("token"); // adjust if your cookie name is different
  return res.json({ message: "Logged out" });
});

router.get("/me", authMiddleware, me);

export default router;