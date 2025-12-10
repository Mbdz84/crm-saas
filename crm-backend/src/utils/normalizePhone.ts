export function normalizePhone(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/[^\d]/g, ""); // keep only digits
}