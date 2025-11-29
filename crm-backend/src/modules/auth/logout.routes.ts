import { Router } from "express";

const router = Router();

router.post("/", (req, res) => {
  res.clearCookie("token");
  return res.json({ message: "Logged out" });
});

export default router;