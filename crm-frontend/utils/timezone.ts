// Timezone options for dropdowns (label → IANA value)
export const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Arizona (Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
];

// US state (2-letter) → IANA timezone (split states use their majority zone)
export const STATE_TZ: Record<string, string> = {
  CA: "America/Los_Angeles",
  WA: "America/Los_Angeles",
  OR: "America/Los_Angeles",
  NV: "America/Los_Angeles",
  CO: "America/Denver",
  MT: "America/Denver",
  NM: "America/Denver",
  UT: "America/Denver",
  WY: "America/Denver",
  ID: "America/Denver",
  AZ: "America/Phoenix",
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

  const zipMatch = address.match(/\b([A-Za-z]{2})\s*,?\s*\d{5}/);
  if (zipMatch) {
    const tz = STATE_TZ[zipMatch[1].toUpperCase()];
    if (tz) return tz;
  }

  const tokens = address.toUpperCase().match(/\b[A-Z]{2}\b/g) || [];
  for (const t of tokens) if (STATE_TZ[t]) return STATE_TZ[t];

  const upper = address.toUpperCase();
  for (const [name, code] of Object.entries(STATE_NAMES)) {
    if (upper.includes(name)) return STATE_TZ[code];
  }

  return null;
}
