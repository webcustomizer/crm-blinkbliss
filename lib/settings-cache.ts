import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 30_000;

let cache: {
  value: NonNullable<Awaited<ReturnType<typeof prisma.cRMSetting.findFirst>>>;
  fetchedAt: number;
} | null = null;

export async function getCachedCRMSettings() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.value;
  }
  const value = await prisma.cRMSetting.findFirst({ orderBy: { createdAt: "asc" } });
  if (!value) return null;
  cache = { value, fetchedAt: Date.now() };
  return value;
}

export function invalidateSettingsCache() {
  cache = null;
}
