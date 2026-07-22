import { prisma } from "@/lib/prisma";

/**
 * Updates the salesperson's rolling average response time when a lead
 * receives its first response. Called after firstResponseAt is set.
 *
 * Computes the average entirely in PostgreSQL via SQL aggregation,
 * replacing the previous unbounded Node.js loop over all leads.
 */
export async function updateResponseTimeAverage(
  userId: string,
): Promise<void> {
  try {
    const rows = await prisma.$queryRaw<{ avg_ms: number | null }[]>`
      SELECT AVG(
        EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt")) * 1000
      )::bigint AS avg_ms
      FROM "Lead"
      WHERE "assignedToId" = ${userId}
        AND "firstResponseAt" IS NOT NULL
    `;

    const avgMs = rows[0]?.avg_ms;

    if (avgMs === null || avgMs === undefined) return;

    await prisma.user.update({
      where: { id: userId },
      data: { responseTimeAvg: Number(avgMs) },
    });
  } catch {
    // Response time tracking should never break the main request
  }
}
