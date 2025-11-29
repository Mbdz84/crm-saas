export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;

  if (digits.startsWith("+")) return digits;

  if (/^\d{10}$/.test(digits)) return "+1" + digits;

  return digits;
}