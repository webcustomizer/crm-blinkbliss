import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const month =
      Number(searchParams.get("month")) || new Date().getMonth() + 1;
    const year = Number(searchParams.get("year")) || new Date().getFullYear();

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const [salespeople, targets, monthJoined, allTimeJoined] =
      await Promise.all([
        prisma.user.findMany({
          where: { role: { in: ["SALESPERSON", "TEAM_LEAD"] } },
          select: {
            id: true,
            name: true,
            email: true,
            monthlyTarget: true,
            targetMonths: true,
            eligibleForTeamLeader: true,
            eligibleSince: true,
            responseTimeAvg: true,
            isActive: true,
            role: true,
            teamLeaderId: true,
            teamLeader: { select: { id: true, name: true } },
            ledTeam: { select: { id: true, name: true } },
            _count: { select: { leads: { where: { isDeleted: false } } } },
          },
          orderBy: [{ isActive: "desc" }, { name: "asc" }],
        }),
        prisma.salesTarget.findMany({ where: { month, year } }),
        prisma.statusHistory.groupBy({
          by: ["leadId"],
          where: {
            newStatus: "JOINED",
            changedAt: { gte: startOfMonth, lte: endOfMonth },
            lead: { assignedToId: { not: null } },
          },
          _count: { id: true },
        }),
        prisma.statusHistory.groupBy({
          by: ["leadId"],
          where: {
            newStatus: "JOINED",
            lead: { assignedToId: { not: null } },
          },
          _count: { id: true },
        }),
      ]);

    const targetMap = new Map(targets.map((t) => [t.userId, t]));
    const leadIds = [
      ...new Set([
        ...monthJoined.map((r) => r.leadId),
        ...allTimeJoined.map((r) => r.leadId),
      ]),
    ];

    const leadAssignments = leadIds.length > 0
      ? await prisma.lead.findMany({
          where: { id: { in: leadIds }, assignedToId: { not: null } },
          select: { id: true, assignedToId: true },
        })
      : [];
    const leadToUser = new Map(
      leadAssignments.map((l) => [l.id, l.assignedToId as string]),
    );

    const achievedMap = new Map<string, number>();
    for (const r of monthJoined) {
      const userId = leadToUser.get(r.leadId);
      if (userId) achievedMap.set(userId, (achievedMap.get(userId) || 0) + r._count.id);
    }

    const totalJoinedMap = new Map<string, number>();
    for (const r of allTimeJoined) {
      const userId = leadToUser.get(r.leadId);
      if (userId) totalJoinedMap.set(userId, (totalJoinedMap.get(userId) || 0) + r._count.id);
    }

    const data = salespeople.map((sp) => {
      const t = targetMap.get(sp.id);
      return {
        id: sp.id,
        name: sp.name,
        email: sp.email,
        monthlyTarget: sp.monthlyTarget,
        targetMonths: sp.targetMonths,
        eligibleForTeamLeader: sp.eligibleForTeamLeader,
        eligibleSince: sp.eligibleSince?.toISOString() ?? null,
        responseTimeAvg: sp.responseTimeAvg,
        isActive: sp.isActive,
        role: sp.role,
        teamLeaderId: sp.teamLeaderId,
        teamLeader: sp.teamLeader,
        ledTeam: sp.ledTeam,
        currentMonthTarget: t?.target ?? sp.monthlyTarget,
        currentMonthAchieved: achievedMap.get(sp.id) ?? 0,
        totalJoinedLeads: totalJoinedMap.get(sp.id) ?? 0,
        targetId: t?.id ?? null,
        totalLeads: sp._count.leads,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch targets." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { userId, month, year, target, achieved } = await req.json();
    if (!userId || !month || !year || target == null) {
      return NextResponse.json(
        { success: false, message: "Missing fields." },
        { status: 400 },
      );
    }

    const existing = await prisma.salesTarget.findUnique({
      where: { userId_month_year: { userId, month, year } },
    });

    if (existing) {
      await prisma.salesTarget.update({
        where: { id: existing.id },
        data: { target, ...(achieved !== undefined ? { achieved } : {}) },
      });
    } else {
      await prisma.salesTarget.create({
        data: { userId, month, year, target, ...(achieved !== undefined ? { achieved } : {}) },
      });
    }

    return NextResponse.json({ success: true, message: "Target updated." });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to update target." },
      { status: 500 },
    );
  }
}
