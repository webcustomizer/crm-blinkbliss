import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getDateRange(filter: string): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  let from: Date;
  switch (filter) {
    case "TODAY": from = new Date(now); from.setHours(0, 0, 0, 0); break;
    case "WEEK": from = new Date(now); from.setDate(from.getDate() - 7); break;
    case "MONTH": from = new Date(now); from.setMonth(from.getMonth() - 1); break;
    case "QUARTER": from = new Date(now); from.setMonth(from.getMonth() - 3); break;
    default: from = new Date(2020, 0, 1); break;
  }
  return { from, to };
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "ALL";
    const { from, to } = getDateRange(filter);

    const teamMemberIds = (
      await prisma.user.findMany({ where: { teamLeaderId: auth.user.id }, select: { id: true } })
    ).map((u) => u.id);
    const allIds = [auth.user.id, ...teamMemberIds];

    const whereBase = { assignedToId: { in: allIds }, isDeleted: false, createdAt: { gte: from, lte: to } };

    const [
      statusCounts, totalLeads,
      dailyLeadsRaw, conversionOverTime, topSources, topCities, recentActivities,
    ] = await Promise.all([
      prisma.lead.groupBy({
        by: ["status"],
        where: whereBase,
        _count: true,
      }),
      prisma.lead.count({ where: whereBase }),
      prisma.lead.findMany({
        where: whereBase,
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.statusHistory.findMany({
        where: { changedAt: { gte: from, lte: to }, lead: { assignedToId: { in: allIds }, isDeleted: false } },
        select: { oldStatus: true, newStatus: true, changedAt: true },
        orderBy: { changedAt: "asc" },
      }),
      prisma.lead.groupBy({
        by: ["source"],
        where: { ...whereBase, source: { not: null } },
        _count: true,
        orderBy: { _count: { source: "desc" } },
        take: 5,
      }),
      prisma.lead.groupBy({
        by: ["city"],
        where: { ...whereBase, city: { not: null } },
        _count: true,
        orderBy: { _count: { city: "desc" } },
        take: 5,
      }),
      prisma.statusHistory.findMany({
        where: { changedAt: { gte: from, lte: to }, lead: { assignedToId: { in: allIds }, isDeleted: false } },
        select: {
          id: true,
          oldStatus: true,
          newStatus: true,
          changedAt: true,
          lead: { select: { name: true, phone: true } },
          changedBy: { select: { name: true } },
        },
        orderBy: { changedAt: "desc" },
        take: 10,
      }),
    ]);

    const memberPerformance = [];
    for (const id of teamMemberIds) {
      const memberWhere = { assignedToId: id, isDeleted: false, createdAt: { gte: from, lte: to } };
      const [total, statusBreakdown, followups, member] = await Promise.all([
        prisma.lead.count({ where: memberWhere }),
        prisma.lead.groupBy({ by: ["status"], where: memberWhere, _count: true }),
        prisma.followUp.count({ where: { userId: id, createdAt: { gte: from, lte: to } } }),
        prisma.user.findUnique({ where: { id }, select: { name: true } }),
      ]);
      const statusMap: Record<string, number> = {};
      for (const sb of statusBreakdown) statusMap[sb.status] = sb._count;
      const joined = statusMap["JOINED"] || 0;
      memberPerformance.push({
        id,
        name: member?.name || "Unknown",
        total,
        newLeads: statusMap["NEW"] || 0,
        called: statusMap["CALLED"] || 0,
        training: statusMap["TRAINING_ATTENDED"] || 0,
        reserved: statusMap["SEAT_RESERVED"] || 0,
        joined,
        dead: statusMap["DEAD"] || 0,
        followups,
        conversionRate: total > 0 ? Math.round((joined / total) * 100) : 0,
      });
    }

    const statusMap: Record<string, number> = {};
    for (const s of statusCounts) statusMap[s.status] = s._count;

    const joinedCount = statusMap["JOINED"] || 0;
    const deadCount = statusMap["DEAD"] || 0;
    const conversionRate = totalLeads > 0 ? Math.round((joinedCount / totalLeads) * 100) : 0;

    const dailyCountsMap: Record<string, number> = {};
    for (const l of dailyLeadsRaw) {
      const day = l.createdAt.toISOString().split("T")[0];
      dailyCountsMap[day] = (dailyCountsMap[day] || 0) + 1;
    }
    const dailyTrend = Object.entries(dailyCountsMap).map(([date, count]) => ({ date, count }));

    const conversionFlows: Record<string, number> = {};
    for (const h of conversionOverTime) {
      const key = `${h.oldStatus}->${h.newStatus}`;
      conversionFlows[key] = (conversionFlows[key] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      data: {
        filter,
        totalLeads,
        joinedCount,
        deadCount,
        conversionRate,
        statusCounts: statusMap,
        memberPerformance,
        dailyTrend,
        conversionFlows,
        topSources: topSources.map((s) => ({ source: s.source || "Direct / Unknown", count: s._count })),
        topCities: topCities.map((c) => ({ city: c.city || "Unknown", count: c._count })),
        recentActivities,
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}
