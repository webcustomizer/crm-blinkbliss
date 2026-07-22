import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 30_000;

let cache: {
  value: Awaited<ReturnType<typeof prisma.cRMSetting.findFirst>>;
  fetchedAt: number;
} | null = null;

export async function getCachedCRMSettings() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.value;
  }
  const value = await prisma.cRMSetting.findFirst();
  cache = { value, fetchedAt: Date.now() };
  return value;
}

export function invalidateSettingsCache() {
  cache = null;
}
