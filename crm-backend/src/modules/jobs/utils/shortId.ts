import prisma from "../../../prisma/client";

export async function generateUniqueShortId(): Promise<string> {
  while (true) {
    const shortId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const exists = await prisma.job.findUnique({ where: { shortId } });
    if (!exists) return shortId;
  }
}