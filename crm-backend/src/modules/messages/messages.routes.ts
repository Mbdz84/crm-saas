import { Router } from "express";
import {
  listConversations,
  getThread,
  sendReply,
  updateConversation,
} from "./messages.controller";

const router = Router();

// GET /messages?box=inbox|blocked|archive  → conversation list
router.get("/", listConversations);

// GET /messages/:id  → thread (+ mark read)
router.get("/:id", getThread);

// POST /messages/:id/reply  → send outbound SMS
router.post("/:id/reply", sendReply);

// PATCH /messages/:id  → move box (inbox | blocked | archive)
router.patch("/:id", updateConversation);

export default router;
