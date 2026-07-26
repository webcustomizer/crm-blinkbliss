import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { getPKTDayBoundaryUTC } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const todayStart = getPKTDayBoundaryUTC(0, false);
    const todayEnd = getPKTDayBoundaryUTC(0, true);
    const twoDaysLater = getPKTDayBoundaryUTC(2, true);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const teamMemberIds = (
      await prisma.user.findMany({ where: { teamLeaderId: auth.user.id }, select: { id: true } })
    ).map((u) => u.id);

    // ── Self scope (2 rounds of 4-3) ──
    const selfId = auth.user.id;
    const selfWhere = { isDeleted: false, assignedToId: selfId };

    const [selfStatusGroups, selfFollowUpLeads, selfOverdueCount, selfUpcomingCount] = await Promise.all([
      prisma.lead.groupBy({ by: ["status"], where: selfWhere, _count: { id: true } }),
      prisma.lead.findMany({
        where: { ...selfWhere, status: { notIn: ["JOINED", "DEAD"] }, nextFollowUp: { gte: todayStart, lte: todayEnd } },
        select: { id: true, name: true, phone: true, status: true, remarks: true, nextFollowUp: true },
        orderBy: { nextFollowUp: "asc" }, take: 20,
      }),
      prisma.lead.count({ where: { ...selfWhere, status: { notIn: ["JOINED", "DEAD"] }, nextFollowUp: { lt: todayStart } } }),
      prisma.lead.count({ where: { ...selfWhere, status: { notIn: ["JOINED", "DEAD"] }, nextFollowUp: { gt: todayEnd, lte: twoDaysLater } } }),
    ]);

    const [selfRecentActivities, selfTodayNewLeads, selfTodayJoined] = await Promise.all([
      prisma.statusHistory.findMany({
        where: { changedAt: { gte: twoDaysAgo }, lead: { ...selfWhere } },
        orderBy: { changedAt: "desc" }, take: 20,
        include: { lead: { select: { name: true, phone: true } }, changedBy: { select: { name: true } } },
      }),
      prisma.lead.count({ where: { ...selfWhere, createdAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.lead.count({ where: { ...selfWhere, status: "JOINED", updatedAt: { gte: todayStart, lte: todayEnd } } }),
    ]);

    const selfStatusMap = new Map(selfStatusGroups.map((g) => [g.status, g._count.id]));
    const selfTotal = selfStatusGroups.reduce((s, g) => s + g._count.id, 0);
    const self = {
      totalLeads: selfTotal,
      newLeads: selfStatusMap.get("NEW") ?? 0,
      calledLeads: selfStatusMap.get("CALLED") ?? 0,
      trainingLeads: selfStatusMap.get("TRAINING_ATTENDED") ?? 0,
      reservedLeads: selfStatusMap.get("SEAT_RESERVED") ?? 0,
      joined: selfStatusMap.get("JOINED") ?? 0,
      dead: selfStatusMap.get("DEAD") ?? 0,
      conversionRate: selfTotal > 0 ? Math.round(((selfStatusMap.get("JOINED") ?? 0) / selfTotal) * 100) : 0,
      todayFollowUps: selfFollowUpLeads.length,
      overdueFollowUps: selfOverdueCount,
      upcomingFollowUps: selfUpcomingCount,
      todayNewLeads: selfTodayNewLeads,
      todayJoined: selfTodayJoined,
      todayFollowUpDetails: selfFollowUpLeads,
      recentActivities: selfRecentActivities,
    };

    // ── Team scope: 3 rounds (max 8 concurrent per round) ──
    const teamAllWhere = { assignedToId: { in: teamMemberIds }, isDeleted: false };
    const hasTeam = teamMemberIds.length > 0;

    // Round 1: core counts + aggregations (8 queries)
    const [
      teamTotalLeads, teamStatusGroups, teamTodayNew, teamTodayJoined,
      teamTodayFollowUps, teamOverdueCount,
      teamLeadStatusByMember, teamFollowupCounts,
    ] = await Promise.all([
      hasTeam ? prisma.lead.count({ where: teamAllWhere }) : 0,
      hasTeam ? prisma.lead.groupBy({ by: ["status"], where: teamAllWhere, _count: { id: true } }) : [],
      hasTeam ? prisma.lead.count({ where: { ...teamAllWhere, createdAt: { gte: todayStart, lte: todayEnd } } }) : 0,
      hasTeam ? prisma.lead.count({ where: { ...teamAllWhere, status: "JOINED", updatedAt: { gte: todayStart, lte: todayEnd } } }) : 0,
      hasTeam ? prisma.followUp.count({ where: { userId: { in: teamMemberIds }, createdAt: { gte: todayStart, lte: todayEnd } } }) : 0,
      hasTeam ? prisma.lead.count({ where: { ...teamAllWhere, status: { notIn: ["JOINED", "DEAD"] }, nextFollowUp: { lt: todayStart } } }) : 0,
      hasTeam ? prisma.lead.groupBy({
        by: ["assignedToId", "status"],
        where: { assignedToId: { in: teamMemberIds }, isDeleted: false },
        _count: { id: true },
      }) : [],
      hasTeam ? prisma.followUp.groupBy({
        by: ["userId"],
        where: { userId: { in: teamMemberIds } },
        _count: { id: true },
      }) : [],
    ]);

    // Round 2: detail queries (7 queries)
    const [
      teamRecentFollowUps, teamMemberPerf,
      teamTodayFULeads, overdueLeads, teamTodayActivity,
      teamTodayFollowupCounts, teamDailyLeads,
    ] = await Promise.all([
      hasTeam ? prisma.followUp.findMany({
        where: { userId: { in: teamMemberIds } },
        select: { id: true, createdAt: true, user: { select: { name: true } }, lead: { select: { name: true, phone: true } } },
        orderBy: { createdAt: "desc" }, take: 5,
      }) : [],
      hasTeam ? prisma.user.findMany({
        where: { teamLeaderId: auth.user.id, isActive: true },
        select: { id: true, name: true, _count: { select: { leads: { where: { isDeleted: false } } } } },
        orderBy: { name: "asc" },
      }) : [],
      hasTeam ? prisma.lead.findMany({
        where: { ...teamAllWhere, status: { notIn: ["JOINED", "DEAD"] }, nextFollowUp: { gte: todayStart, lte: todayEnd } },
        select: { id: true, name: true, phone: true, status: true, nextFollowUp: true, assignedToId: true },
        orderBy: { nextFollowUp: "asc" }, take: 100,
      }) : [],
      hasTeam ? prisma.lead.findMany({
        where: { ...teamAllWhere, status: { notIn: ["JOINED", "DEAD"] }, nextFollowUp: { lt: todayStart } },
        select: { id: true, name: true, phone: true, status: true, nextFollowUp: true, assignedToId: true },
        orderBy: { nextFollowUp: "asc" }, take: 100,
      }) : [],
      hasTeam ? prisma.statusHistory.findMany({
        where: {
          changedAt: { gte: todayStart, lte: todayEnd },
          lead: { isDeleted: false, assignedToId: { in: teamMemberIds } },
        },
        orderBy: { changedAt: "desc" }, take: 20,
        include: {
          lead: { select: { name: true, phone: true } },
          changedBy: { select: { name: true } },
        },
      }) : [],
      hasTeam ? prisma.followUp.groupBy({
        by: ["userId"],
        where: { userId: { in: teamMemberIds }, createdAt: { gte: todayStart, lte: todayEnd } },
        _count: { id: true },
      }) : [],
      // Daily trend: sequential small counts (1 connection at a time)
      hasTeam ? (async () => {
        const trend: { date: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const day = new Date();
          day.setDate(day.getDate() - i);
          day.setHours(0, 0, 0, 0);
          const nextDay = new Date(day);
          nextDay.setDate(nextDay.getDate() + 1);
          const count = await prisma.lead.count({
            where: { ...teamAllWhere, createdAt: { gte: day, lt: nextDay } },
          });
          trend.push({ date: day.toISOString().split("T")[0], count });
        }
        return trend;
      })() : [],
    ]);

    // Build lookup maps from aggregated data
    const memberStatusMap = new Map<string, Map<string, number>>();
    for (const g of teamLeadStatusByMember) {
      const memberId = g.assignedToId!;
      if (!memberStatusMap.has(memberId)) memberStatusMap.set(memberId, new Map());
      memberStatusMap.get(memberId)!.set(g.status, g._count.id);
    }

    const followupCountMap = new Map<string, number>();
    for (const g of teamFollowupCounts) followupCountMap.set(g.userId, g._count.id);

    const todayFollowupCountMap = new Map<string, number>();
    for (const g of teamTodayFollowupCounts) todayFollowupCountMap.set(g.userId, g._count.id);

    // Build member name map (avoids N+1 re-fetch)
    const memberNameMap = new Map<string, string>();
    for (const m of teamMemberPerf) memberNameMap.set(m.id, m.name);

    // Build today's follow-ups grouped by member
    const todayFollowUpsByMemberMap = new Map<string, typeof teamTodayFULeads>();
    for (const lead of teamTodayFULeads) {
      const list = todayFollowUpsByMemberMap.get(lead.assignedToId!) || [];
      list.push(lead);
      todayFollowUpsByMemberMap.set(lead.assignedToId!, list);
    }

    // Build overdue grouped by member
    const overdueByMemberMap = new Map<string, typeof overdueLeads>();
    for (const lead of overdueLeads) {
      const list = overdueByMemberMap.get(lead.assignedToId!) || [];
      list.push(lead);
      overdueByMemberMap.set(lead.assignedToId!, list);
    }

    const teamStatusMap = new Map(teamStatusGroups.map((g) => [g.status, g._count.id]));
    const teamJoined = teamStatusMap.get("JOINED") ?? 0;
    const teamDead = teamStatusMap.get("DEAD") ?? 0;
    const teamNew = teamStatusMap.get("NEW") ?? 0;
    const team = {
      totalLeads: teamTotalLeads,
      joined: teamJoined,
      dead: teamDead,
      newLeads: teamNew,
      calledLeads: teamStatusMap.get("CALLED") ?? 0,
      trainingLeads: teamStatusMap.get("TRAINING_ATTENDED") ?? 0,
      reservedLeads: teamStatusMap.get("SEAT_RESERVED") ?? 0,
      followUpNeeded: teamStatusMap.get("NEED_MORE_FOLLOW_UP") ?? 0,
      conversionRate: teamTotalLeads > 0 ? Math.round((teamJoined / teamTotalLeads) * 100) : 0,
      todayFollowUps: teamTodayFollowUps,
      todayNewLeads: teamTodayNew,
      todayJoined: teamTodayJoined,
      overdueFollowUps: teamOverdueCount,
      recentFollowUps: teamRecentFollowUps,
      dailyTrend: teamDailyLeads,
    };

    // Build per-member performance from aggregated data (no N+1 queries)
    const teamPerf = teamMemberPerf.map((m) => {
      const statuses = memberStatusMap.get(m.id);
      const mJoined = statuses?.get("JOINED") ?? 0;
      const mDead = statuses?.get("DEAD") ?? 0;
      const mFollowups = followupCountMap.get(m.id) ?? 0;
      const mTodayFollowups = todayFollowupCountMap.get(m.id) ?? 0;
      const mOverdueLeads = overdueByMemberMap.get(m.id) || [];
      return {
        id: m.id,
        name: m.name,
        totalLeads: m._count.leads,
        joined: mJoined,
        dead: mDead,
        followups: mFollowups,
        todayFollowups: mTodayFollowups,
        overdue: mOverdueLeads.length,
        overdueLeads: mOverdueLeads.slice(0, 3).map((l) => ({
          id: l.id, name: l.name, phone: l.phone, nextFollowUp: l.nextFollowUp,
        })),
      };
    });

    // Build todayFollowUpsByMember using name map (no N+1 user queries)
    const todayFollowUpsByMember = Array.from(todayFollowUpsByMemberMap.entries()).map(([id, leads]) => ({
      userId: id,
      userName: memberNameMap.get(id) || "Unknown",
      count: leads.length,
      leads: leads.map((l) => ({
        id: l.id, name: l.name, phone: l.phone, status: l.status, nextFollowUp: l.nextFollowUp,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: {
        self,
        team,
        teamSize: teamMemberIds.length,
        teamPerformance: teamPerf,
        todayFollowUpsByMember: todayFollowUpsByMember.filter((m) => m.leads.length > 0),
        teamActivity: teamTodayActivity,
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}
