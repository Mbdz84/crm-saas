import { PrismaClient } from "@prisma/client";

// Never return a lead source's API key hash in any query result, so it can't
// leak to the browser through `source: true` includes. Lookups that filter
// WHERE apiKeyHash = … (API-key auth) still work — omit only affects output.
const prisma = new PrismaClient({
  omit: {
    leadSource: { apiKeyHash: true },
  },
});
export default prisma;
