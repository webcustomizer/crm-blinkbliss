import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["SALESPERSON", "TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const userId = auth.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        monthlyTarget: true,
        targetMonths: true,
        eligibleForTeamLeader: true,
        eligibleSince: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let salesTarget = await prisma.salesTarget.findUnique({
      where: { userId_month_year: { userId, month: currentMonth, year: currentYear } },
    });

    if (!salesTarget && user.monthlyTarget > 0) {
      salesTarget = await prisma.salesTarget.upsert({
        where: { userId_month_year: { userId, month: currentMonth, year: currentYear } },
        create: { userId, month: currentMonth, year: currentYear, target: user.monthlyTarget },
        update: {},
      });
    }

    const monthlyTarget = salesTarget?.target ?? user.monthlyTarget;

    const evaluationStart = new Date(currentYear, currentMonth - user.targetMonths, 1);
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    const historicalTargets = await prisma.salesTarget.findMany({
      where: { userId, month: { gte: evaluationStart.getMonth() + 1, lte: currentMonth }, year: { gte: evaluationStart.getFullYear(), lte: currentYear } },
      select: { month: true, year: true, target: true },
    });
    const histMap = new Map(historicalTargets.map((t) => [`${t.year}-${t.month}`, t.target]));

    let totalGoal = 0;
    for (let i = user.targetMonths - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const key = `${y}-${m}`;
      totalGoal += histMap.get(key) ?? user.monthlyTarget;
    }

    const monthlyJoinedLeads = await prisma.statusHistory.count({
      where: {
        newStatus: "JOINED",
        changedAt: { gte: startOfMonth, lte: endOfMonth },
        lead: { assignedToId: userId },
      },
    });

    const totalJoinedLeads = await prisma.statusHistory.count({
      where: {
        newStatus: "JOINED",
        lead: { assignedToId: userId },
      },
    });

    const evaluationJoinedLeads = await prisma.statusHistory.count({
      where: {
        newStatus: "JOINED",
        changedAt: { gte: evaluationStart, lte: endOfMonth },
        lead: { assignedToId: userId },
      },
    });

    let eligibleForTeamLeader = user.eligibleForTeamLeader;
    let eligibleSince = user.eligibleSince;

    if (evaluationJoinedLeads >= totalGoal && totalGoal > 0 && !user.eligibleForTeamLeader) {
      const now_ = new Date();
      await prisma.user.update({
        where: { id: userId },
        data: { eligibleForTeamLeader: true, eligibleSince: now_ },
      });
      eligibleForTeamLeader = true;
      eligibleSince = now_;
    }

    return NextResponse.json({
      success: true,
      data: {
        monthlyTarget,
        targetMonths: user.targetMonths,
        totalGoal,
        monthlyJoinedLeads,
        evaluationJoinedLeads,
        totalJoinedLeads,
        eligibleForTeamLeader,
        eligibleSince: eligibleSince?.toISOString() ?? null,
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}
