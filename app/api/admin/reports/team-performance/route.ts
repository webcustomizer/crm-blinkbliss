import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "ALL";

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let dateWhere: any = {};
    if (filter !== "ALL") {
      const pktOffset = 5 * 60 * 60 * 1000;
      const pktNow = new Date(Date.now() + pktOffset);
      switch (filter) {
        case "TODAY":
          dateWhere.createdAt = {
            gte: new Date(Date.UTC(pktNow.getUTCFullYear(), pktNow.getUTCMonth(), pktNow.getUTCDate()) - pktOffset),
          };
          break;
        case "WEEK":
          dateWhere.createdAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
          break;
        case "MONTH":
          dateWhere.createdAt = {
            gte: new Date(Date.UTC(pktNow.getUTCFullYear(), pktNow.getUTCMonth(), 1) - pktOffset),
          };
          break;
      }
    }

    const teams = await prisma.team.findMany({
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
            monthlyTarget: true,
            targetMonths: true,
          },
        },
        targets: {
          where: { month: currentMonth, year: currentYear },
        },
      },
    });

    const teamIds = teams.map((t) => t.leaderId);
    const membersByTeam: Record<string, any[]> = {};

    if (teamIds.length > 0) {
      const allMembers = await prisma.user.findMany({
        where: { teamLeaderId: { in: teamIds } },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          monthlyTarget: true,
          teamLeaderId: true,
          salesTargets: {
            where: { month: currentMonth, year: currentYear },
            select: { target: true, achieved: true },
          },
        },
      });

      for (const m of allMembers) {
        if (!membersByTeam[m.teamLeaderId!]) membersByTeam[m.teamLeaderId!] = [];
        membersByTeam[m.teamLeaderId!].push(m);
      }
    }

    const allMemberIds = Object.values(membersByTeam).flat().map((m) => m.id);
    const leadCounts: { assignedToId: string; status: string; _count: number }[] = [];

    if (allMemberIds.length > 0) {
      const counts = await prisma.lead.groupBy({
        by: ["assignedToId", "status"],
        where: {
          assignedToId: { in: allMemberIds },
          isDeleted: false,
          ...(filter !== "ALL" ? dateWhere : {}),
        },
        _count: true,
      });
      for (const c of counts) {
        leadCounts.push({ assignedToId: c.assignedToId!, status: c.status, _count: c._count });
      }
    }

    const teamsPerformance = await Promise.all(
      teams.map(async (team) => {
        const members = membersByTeam[team.leaderId] || [];
        const teamTarget = team.targets[0];

        const memberPerformance = members.map((m: any) => {
          const memberLeads = leadCounts.filter((l) => l.assignedToId === m.id);
          const total = memberLeads.reduce((s, l) => s + l._count, 0);
          const getCount = (status: string) => memberLeads.find((l) => l.status === status)?._count ?? 0;
          const joined = getCount("JOINED");
          const dead = getCount("DEAD");
          const target = m.salesTargets?.[0]?.target ?? m.monthlyTarget ?? 50;
          const achieved = m.salesTargets?.[0]?.achieved ?? 0;

          return {
            id: m.id,
            name: m.name,
            email: m.email,
            isActive: m.isActive,
            total,
            newLeads: getCount("NEW"),
            called: getCount("CALLED"),
            followups: getCount("NEED_MORE_FOLLOW_UP"),
            training: getCount("TRAINING_ATTENDED"),
            reserved: getCount("SEAT_RESERVED"),
            joined,
            dead,
            conversionRate: total > 0 ? Number(((joined / total) * 100).toFixed(1)) : 0,
            monthlyTarget: target,
            monthlyAchieved: achieved,
          };
        });

        const teamLeads = leadCounts.filter((l) => members.some((m: any) => m.id === l.assignedToId));
        const teamTotal = teamLeads.reduce((s, l) => s + l._count, 0);
        const teamJoined = teamLeads.filter((l) => l.status === "JOINED").reduce((s, l) => s + l._count, 0);
        const teamDead = teamLeads.filter((l) => l.status === "DEAD").reduce((s, l) => s + l._count, 0);
        const teamNew = teamLeads.filter((l) => l.status === "NEW").reduce((s, l) => s + l._count, 0);
        const teamCalled = teamLeads.filter((l) => l.status === "CALLED").reduce((s, l) => s + l._count, 0);
        const teamFollowups = teamLeads.filter((l) => l.status === "NEED_MORE_FOLLOW_UP").reduce((s, l) => s + l._count, 0);
        const teamTraining = teamLeads.filter((l) => l.status === "TRAINING_ATTENDED").reduce((s, l) => s + l._count, 0);
        const teamReserved = teamLeads.filter((l) => l.status === "SEAT_RESERVED").reduce((s, l) => s + l._count, 0);

        const sortedMembers = [...memberPerformance].sort((a, b) => b.joined - a.joined);
        const teamConversionRate = teamTotal > 0 ? Number(((teamJoined / teamTotal) * 100).toFixed(1)) : 0;
        const topPerformer = sortedMembers[0]?.name ?? "N/A";

        return {
          id: team.id,
          name: team.name,
          leaderId: team.leaderId,
          leaderName: team.leader.name,
          leaderEmail: team.leader.email,
          memberCount: members.length,
          totalLeads: teamTotal,
          newLeads: teamNew,
          called: teamCalled,
          followups: teamFollowups,
          training: teamTraining,
          reserved: teamReserved,
          joined: teamJoined,
          dead: teamDead,
          conversionRate: teamConversionRate,
          topPerformer,
          monthlyTarget: teamTarget?.target ?? team.leader.monthlyTarget ?? 0,
          monthlyAchieved: teamTarget?.achieved ?? 0,
          members: sortedMembers,
        };
      }),
    );

    const sortedTeams = [...teamsPerformance].sort((a, b) => b.conversionRate - a.conversionRate);

    const totalTeams = teams.length;
    const totalMembers = Object.values(membersByTeam).reduce((s, m) => s + m.length, 0);
    const totalLeadsAll = sortedTeams.reduce((s, t) => s + t.totalLeads, 0);
    const totalJoinedAll = sortedTeams.reduce((s, t) => s + t.joined, 0);
    const totalDeadAll = sortedTeams.reduce((s, t) => s + t.dead, 0);
    const overallConversion = totalLeadsAll > 0 ? Number(((totalJoinedAll / totalLeadsAll) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalTeams,
          totalMembers,
          totalLeads: totalLeadsAll,
          totalJoined: totalJoinedAll,
          totalDead: totalDeadAll,
          overallConversion,
        },
        teams: sortedTeams,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to load team performance." },
      { status: 500 },
    );
  }
}
