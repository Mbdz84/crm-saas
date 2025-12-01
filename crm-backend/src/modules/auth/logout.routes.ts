import { Router } from "express";

const router = Router();

router.post("/", (req, res) => {
  const isLocal =
    req.hostname === "localhost" ||
    req.hostname.startsWith("127.") ||
    req.hostname.startsWith("10.") ||
    req.hostname.startsWith("192.168.");

  res.cookie("token", "", {
    httpOnly: true,
    secure: !isLocal,
    sameSite: isLocal ? "lax" : "none",
    domain: isLocal ? undefined : ".moriel.work",
    path: "/",
    expires: new Date(0) // Force removal
  });

  return res.json({ message: "Logged out" });
});

export default router;