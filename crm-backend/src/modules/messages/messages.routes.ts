import { Router } from "express";
import {
  listConversations,
  getThread,
  sendReply,
  updateConversation,
  deleteConversation,
  unreadCount,
} from "./messages.controller";
import { techPerms } from "../../utils/scope";

const router = Router();

// Block chat entirely for technicians who don't have chat access.
router.use(async (req, res, next) => {
  try {
    const perms = await techPerms(req);
    if (perms && !perms.canUseChat) {
      return res.status(403).json({ error: "Chat disabled" });
    }
  } catch {
    /* ignore — fall through */
  }
  next();
});

// GET /messages/unread-count  → total unread in the inbox
// (must be BEFORE the "/:id" route so it isn't captured as an id)
router.get("/unread-count", unreadCount);

// GET /messages?box=inbox|blocked|archive  → conversation list
router.get("/", listConversations);

// GET /messages/:id  → thread (+ mark read)
router.get("/:id", getThread);

// POST /messages/:id/reply  → send outbound SMS
router.post("/:id/reply", sendReply);

// PATCH /messages/:id  → move box (inbox | blocked | archive)
router.patch("/:id", updateConversation);

// DELETE /messages/:id  → delete conversation + messages
router.delete("/:id", deleteConversation);

export default router;
