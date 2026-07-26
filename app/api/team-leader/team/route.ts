import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    const members = await prisma.user.findMany({
      where: { teamLeaderId: auth.user.id },
      select: {
        id: true, name: true, email: true, phone: true, isActive: true,
        monthlyTarget: true, createdAt: true,
        _count: { select: { leads: { where: { isDeleted: false } } } },
      },
      orderBy: { name: "asc" },
    });

    const memberIds = members.map((m) => m.id);

    const salesTargets = await prisma.salesTarget.findMany({
      where: { userId: { in: memberIds }, month: currentMonth, year: currentYear },
    });
    const targetMap = new Map(salesTargets.map((t) => [t.userId, t.target]));

    const [statusCounts, joinedCounts, deadCounts, lastFollowups] = await Promise.all([
      prisma.lead.groupBy({
        by: ["status", "assignedToId"],
        where: { assignedToId: { in: memberIds }, isDeleted: false },
        _count: true,
      }),
      prisma.lead.groupBy({
        by: ["assignedToId"],
        where: { assignedToId: { in: memberIds }, isDeleted: false, status: "JOINED" },
        _count: true,
      }),
      prisma.lead.groupBy({
        by: ["assignedToId"],
        where: { assignedToId: { in: memberIds }, isDeleted: false, status: "DEAD" },
        _count: true,
      }),
      prisma.followUp.findMany({
        where: { userId: { in: memberIds } },
        select: { userId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: memberIds.length,
      }),
    ]);

    const monthlyJoinedRecords = await prisma.statusHistory.findMany({
      where: {
        newStatus: "JOINED",
        changedAt: { gte: startOfMonth, lte: endOfMonth },
        lead: { assignedToId: { in: memberIds } },
      },
      select: { lead: { select: { assignedToId: true } } },
    });

    const monthlyJoinedMap: Record<string, number> = {};
    for (const rec of monthlyJoinedRecords) {
      const id = rec.lead?.assignedToId;
      if (id) monthlyJoinedMap[id] = (monthlyJoinedMap[id] || 0) + 1;
    }

    const statusMap: Record<string, Record<string, number>> = {};
    for (const sc of statusCounts) {
      if (sc.assignedToId) {
        if (!statusMap[sc.assignedToId]) statusMap[sc.assignedToId] = {};
        statusMap[sc.assignedToId][sc.status] = sc._count;
      }
    }

    const joinedMap: Record<string, number> = {};
    for (const jc of joinedCounts) {
      if (jc.assignedToId) joinedMap[jc.assignedToId] = jc._count;
    }

    const deadMap: Record<string, number> = {};
    for (const dc of deadCounts) {
      if (dc.assignedToId) deadMap[dc.assignedToId] = dc._count;
    }

    const lastFollowupMap: Record<string, Date> = {};
    for (const lf of lastFollowups) {
      if (!lastFollowupMap[lf.userId] || lf.createdAt > lastFollowupMap[lf.userId]) {
        lastFollowupMap[lf.userId] = lf.createdAt;
      }
    }

    const enriched = members.map((m) => ({
      ...m,
      currentMonthTarget: targetMap.get(m.id) ?? m.monthlyTarget,
      statusCounts: statusMap[m.id] || {},
      joinedCount: joinedMap[m.id] || 0,
      monthlyJoinedCount: monthlyJoinedMap[m.id] || 0,
      deadCount: deadMap[m.id] || 0,
      lastFollowUpAt: lastFollowupMap[m.id] || null,
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}
