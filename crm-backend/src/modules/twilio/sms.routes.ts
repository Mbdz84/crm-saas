import { Router } from "express";
import { incomingSms } from "./sms.controller";

const router = Router();

router.post("/sms", incomingSms);

export default router;