export function formatPhone(num?: string | null): string {
  if (!num) return "";
  const digits = num.replace(/[^\d]/g, "").slice(-10); // last 10 digits
  if (digits.length !== 10) return num;

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}