import { Router } from "express";
import { register, login, me } from "./auth.controller";
import { authMiddleware } from "../../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);

// ⭐ LOGOUT ENDPOINT
// clearCookie must use the SAME domain/path/sameSite/secure the login used,
// or the browser won't actually delete the cookie (it stayed logged in on prod).
router.post("/logout", (req, res) => {
  const isLocal =
    req.hostname === "localhost" ||
    req.hostname.startsWith("127.") ||
    req.hostname.startsWith("10.") ||
    req.hostname.startsWith("192.168.");

  res.clearCookie("token", {
    httpOnly: true,
    secure: !isLocal,
    sameSite: isLocal ? "lax" : "none",
    domain: isLocal ? undefined : ".moriel.work",
    path: "/",
  });

  return res.json({ message: "Logged out" });
});

router.get("/me", authMiddleware, me);

export default router;