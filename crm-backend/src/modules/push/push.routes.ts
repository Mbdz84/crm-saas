import { Router } from "express";
import { subscribe, unsubscribe } from "./push.controller";

// Mounted in app.ts as: app.use("/push", authMiddleware, tenantMiddleware, pushRoutes)
const router = Router();

router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);

export default router;
