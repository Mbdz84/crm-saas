export function money(v: any) {
  return v === null || v === undefined || isNaN(Number(v))
    ? "-"
    : `$${Number(v).toFixed(2)}`;
}