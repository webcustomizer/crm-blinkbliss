import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { getPKTDayBoundaryUTC } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

    const salespersonId = user.id;

    const todayStart = getPKTDayBoundaryUTC(0, false);
    const todayEnd = getPKTDayBoundaryUTC(0, true);
    const twoDaysLater = getPKTDayBoundaryUTC(2, true);

    const [statusGroups, followUpLeads, activities] =
      await Promise.all([
        // 1 query: all status counts via GROUP BY
        prisma.lead.groupBy({
          by: ["status"],
          where: { isDeleted: false, assignedToId: salespersonId },
          _count: { id: true },
        }),

        // Follow-up leads for today (detail list)
        prisma.lead.findMany({
          where: {
            isDeleted: false,
            assignedToId: salespersonId,
            status: { notIn: ["JOINED", "DEAD"] },
            nextFollowUp: { gte: todayStart, lte: todayEnd },
          },
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            remarks: true,
            nextFollowUp: true,
          },
          orderBy: { nextFollowUp: "asc" },
        }),

        // Recent activity (last 2 days)
        prisma.statusHistory.findMany({
          where: {
            changedAt: { gte: twoDaysAgo() },
            lead: { isDeleted: false, assignedToId: salespersonId },
          },
          orderBy: { changedAt: "desc" },
          take: 20,
          include: {
            lead: { select: { name: true, phone: true } },
            changedBy: { select: { name: true } },
          },
        }),
      ]);

    // Build status count map from GROUP BY result
    const statusMap = new Map(
      statusGroups.map((g) => [g.status, g._count.id]),
    );

    const totalLeads = statusGroups.reduce((s, g) => s + g._count.id, 0);
    const newLeads = statusMap.get("NEW") ?? 0;
    const calledLeads = statusMap.get("CALLED") ?? 0;
    const trainingLeads = statusMap.get("TRAINING_ATTENDED") ?? 0;
    const reservedLeads = statusMap.get("SEAT_RESERVED") ?? 0;
    const joinedLeads = statusMap.get("JOINED") ?? 0;
    const deadLeads = statusMap.get("DEAD") ?? 0;
    const conversionRate =
      totalLeads === 0 ? 0 : Math.round((joinedLeads / totalLeads) * 100);

    // Compute follow-up date buckets from the detail list + remaining queries
    let todayFollowUps = 0;
    let overdueFollowUps = 0;
    let upcomingFollowUps = 0;

    for (const lead of followUpLeads) {
      if (!lead.nextFollowUp) continue;
      const t = lead.nextFollowUp.getTime();
      if (t >= todayStart.getTime() && t <= todayEnd.getTime()) {
        todayFollowUps++;
      }
    }

    // For overdue and upcoming, use individual counts (small, fast queries)
    const [overdueCount, upcomingCount] = await Promise.all([
      prisma.lead.count({
        where: {
          isDeleted: false,
          assignedToId: salespersonId,
          status: { notIn: ["JOINED", "DEAD"] },
          nextFollowUp: { lt: todayStart },
        },
      }),
      prisma.lead.count({
        where: {
          isDeleted: false,
          assignedToId: salespersonId,
          status: { notIn: ["JOINED", "DEAD"] },
          nextFollowUp: { gt: todayEnd, lte: twoDaysLater },
        },
      }),
    ]);

    overdueFollowUps = overdueCount;
    upcomingFollowUps = upcomingCount;

    return NextResponse.json({
      userId: salespersonId,
      stats: {
        totalLeads,
        newLeads,
        calledLeads,
        trainingLeads,
        reservedLeads,
        joinedLeads,
        deadLeads,
        todayFollowUps,
        overdueFollowUps,
        upcomingFollowUps,
        conversionRate,
      },
      followUps: followUpLeads,
      activities,
    });
  } catch (error) {
    console.error("Sales Dashboard Error:", error);

    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 },
    );
  }
}

function twoDaysAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 2);
  return d;
}
