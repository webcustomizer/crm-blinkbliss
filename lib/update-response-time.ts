import { prisma } from "@/lib/prisma";

/**
 * Updates the salesperson's rolling average response time when a lead
 * receives its first response. Called after firstResponseAt is set.
 *
 * Computes the average of (firstResponseAt - createdAt) across ALL
 * leads assigned to this salesperson that have a first response.
 */
export async function updateResponseTimeAverage(
  userId: string,
): Promise<void> {
  try {
    const leads = await prisma.lead.findMany({
      where: {
        assignedToId: userId,
        firstResponseAt: { not: null },
      },
      select: {
        createdAt: true,
        firstResponseAt: true,
      },
    });

    if (leads.length === 0) return;

    let totalMs = 0;
    for (const lead of leads) {
      if (lead.firstResponseAt) {
        totalMs += lead.firstResponseAt.getTime() - lead.createdAt.getTime();
      }
    }

    const avgMs = Math.round(totalMs / leads.length);

    await prisma.user.update({
      where: { id: userId },
      data: { responseTimeAvg: avgMs },
    });
  } catch {
    // Response time tracking should never break the main request
  }
}
