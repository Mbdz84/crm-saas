export function balanceColor(val: any) {
  const num = Number(val || 0);
  if (num < 0) return "text-red-600 font-semibold";
  if (num > 0) return "text-green-700 font-semibold";
  return "text-gray-600";
}