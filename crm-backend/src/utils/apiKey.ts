import crypto from "crypto";

/* ============================================================
   Generate a secure API key (shown ONCE)
============================================================ */
export function generateApiKey() {
  const raw = crypto.randomBytes(32).toString("hex");
  return `ls_live_${raw}`;
}

/* ============================================================
   Hash API key for storage
============================================================ */
export function hashApiKey(apiKey: string) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/* ============================================================
   Extract last 4 characters (for UI)
============================================================ */
export function getLast4(apiKey: string) {
  return apiKey.slice(-4);
}