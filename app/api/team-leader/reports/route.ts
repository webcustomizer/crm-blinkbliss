import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { getPKTDayBoundaryUTC } from "@/lib/format-date";

export const dynamic = "force-dynamic";

function getDateRange(filter: string): { from: Date; to: Date } {
  const to = getPKTDayBoundaryUTC(0, true);
  let from: Date;
  switch (filter) {
    case "TODAY": from = getPKTDayBoundaryUTC(0, false); break;
    case "WEEK": from = getPKTDayBoundaryUTC(-7, false); break;
    case "MONTH": from = getPKTDayBoundaryUTC(-30, false); break;
    case "QUARTER": from = getPKTDayBoundaryUTC(-90, false); break;
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
      dailyTrendRows, conversionOverTime, topSources, topCities, recentActivities,
    ] = await Promise.all([
      prisma.lead.groupBy({
        by: ["status"],
        where: whereBase,
        _count: true,
      }),
      prisma.lead.count({ where: whereBase }),
      prisma.$queryRaw<{ date: Date; count: number }[]>`
        SELECT DATE_TRUNC('day', "createdAt")::date AS date, COUNT(*)::int AS count
        FROM "Lead"
        WHERE "assignedToId" IN (${Prisma.join(allIds)})
          AND "isDeleted" = false
          AND "createdAt" >= ${from}
          AND "createdAt" <= ${to}
        GROUP BY DATE_TRUNC('day', "createdAt")::date
        ORDER BY date ASC
      `,
      prisma.statusHistory.groupBy({
        by: ["oldStatus", "newStatus"],
        where: { changedAt: { gte: from, lte: to }, lead: { assignedToId: { in: allIds }, isDeleted: false } },
        _count: true,
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

    const memberPerformance = await Promise.all(
      teamMemberIds.map(async (id) => {
        const memberWhere = { assignedToId: id, isDeleted: false, createdAt: { gte: from, lte: to } };
        const [total, statusBreakdown, followups, member] = await Promise.all([
          prisma.lead.count({ where: memberWhere }),
          prisma.lead.groupBy({ by: ["status"], where: memberWhere, _count: true }),
          prisma.followUp.count({ where: { userId: id, followUpNumber: { gt: 0 }, createdAt: { gte: from, lte: to } } }),
          prisma.user.findUnique({ where: { id }, select: { name: true } }),
        ]);
        const statusMap: Record<string, number> = {};
        for (const sb of statusBreakdown) statusMap[sb.status] = sb._count;
        const joined = statusMap["JOINED"] || 0;
        return {
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
        };
      })
    );

    const statusMap: Record<string, number> = {};
    for (const s of statusCounts) statusMap[s.status] = s._count;

    const joinedCount = statusMap["JOINED"] || 0;
    const deadCount = statusMap["DEAD"] || 0;
    const conversionRate = totalLeads > 0 ? Math.round((joinedCount / totalLeads) * 100) : 0;

    const dailyTrend = dailyTrendRows.map((row) => ({
      date: row.date.toISOString().split("T")[0],
      count: row.count,
    }));

    const conversionFlows: Record<string, number> = {};
    for (const h of conversionOverTime) {
      const key = `${h.oldStatus}->${h.newStatus}`;
      conversionFlows[key] = h._count;
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
