import prisma from "../prisma/client";

/**
 * US state (2-letter) → IANA timezone.
 * Split-timezone states use their majority zone; the job page lets a user
 * override manually when needed.
 */
export const STATE_TZ: Record<string, string> = {
  // Pacific
  CA: "America/Los_Angeles",
  WA: "America/Los_Angeles",
  OR: "America/Los_Angeles",
  NV: "America/Los_Angeles",
  // Mountain
  CO: "America/Denver",
  MT: "America/Denver",
  NM: "America/Denver",
  UT: "America/Denver",
  WY: "America/Denver",
  ID: "America/Denver",
  // Arizona (no DST)
  AZ: "America/Phoenix",
  // Central
  IL: "America/Chicago",
  AL: "America/Chicago",
  AR: "America/Chicago",
  IA: "America/Chicago",
  KS: "America/Chicago",
  LA: "America/Chicago",
  MN: "America/Chicago",
  MS: "America/Chicago",
  MO: "America/Chicago",
  NE: "America/Chicago",
  ND: "America/Chicago",
  OK: "America/Chicago",
  SD: "America/Chicago",
  TN: "America/Chicago",
  TX: "America/Chicago",
  WI: "America/Chicago",
  // Eastern
  NY: "America/New_York",
  CT: "America/New_York",
  DE: "America/New_York",
  DC: "America/New_York",
  FL: "America/New_York",
  GA: "America/New_York",
  IN: "America/New_York",
  KY: "America/New_York",
  ME: "America/New_York",
  MD: "America/New_York",
  MA: "America/New_York",
  MI: "America/New_York",
  NH: "America/New_York",
  NJ: "America/New_York",
  NC: "America/New_York",
  OH: "America/New_York",
  PA: "America/New_York",
  RI: "America/New_York",
  SC: "America/New_York",
  VT: "America/New_York",
  VA: "America/New_York",
  WV: "America/New_York",
  // Non-contiguous
  AK: "America/Anchorage",
  HI: "Pacific/Honolulu",
};

const STATE_NAMES: Record<string, string> = {
  CALIFORNIA: "CA",
  ILLINOIS: "IL",
  "NEW YORK": "NY",
  TEXAS: "TX",
  FLORIDA: "FL",
  ARIZONA: "AZ",
  WASHINGTON: "WA",
  OREGON: "OR",
  NEVADA: "NV",
  COLORADO: "CO",
  GEORGIA: "GA",
  INDIANA: "IN",
  WISCONSIN: "WI",
  MICHIGAN: "MI",
  OHIO: "OH",
  MISSOURI: "MO",
  MINNESOTA: "MN",
};

/** Best-effort timezone from a free-text US address (state code or name). */
export function timezoneFromAddress(address?: string | null): string | null {
  if (!address) return null;

  // 1) 2-letter state code right before a 5-digit ZIP (Google format)
  const zipMatch = address.match(/\b([A-Za-z]{2})\s*,?\s*\d{5}/);
  if (zipMatch) {
    const tz = STATE_TZ[zipMatch[1].toUpperCase()];
    if (tz) return tz;
  }

  // 2) any standalone token that is a known state code
  const tokens = address.toUpperCase().match(/\b[A-Z]{2}\b/g) || [];
  for (const t of tokens) if (STATE_TZ[t]) return STATE_TZ[t];

  // 3) full state name
  const upper = address.toUpperCase();
  for (const [name, code] of Object.entries(STATE_NAMES)) {
    if (upper.includes(name)) return STATE_TZ[code];
  }

  return null;
}

/**
 * Resolve a job's timezone: address (state) → assigned tech → company → default.
 * Short-circuits so we only query the DB when the address doesn't resolve it.
 */
export async function resolveTimezoneForJob(
  companyId: string,
  address?: string | null,
  technicianId?: string | null
): Promise<string> {
  const fromAddr = timezoneFromAddress(address);
  if (fromAddr) return fromAddr;

  if (technicianId) {
    const tech = await prisma.user.findUnique({
      where: { id: technicianId },
      select: { timezone: true },
    });
    if (tech?.timezone) return tech.timezone;
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { timezone: true },
  });
  return company?.timezone || "America/Chicago";
}
