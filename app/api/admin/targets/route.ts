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

    const salespeople = await prisma.user.findMany({
      where: {
        role: "SALESPERSON",
      },
      select: {
        id: true,
        name: true,
        email: true,
        monthlyTarget: true,
        responseTimeAvg: true,
        isActive: true,
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    const targets = await prisma.salesTarget.findMany({
      where: { month, year },
    });

    const targetMap = new Map(targets.map((t) => [t.userId, t]));

    // Count achieved (joined) leads for this month via StatusHistory
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const joinedRecords = await prisma.statusHistory.findMany({
      where: {
        newStatus: "JOINED",
        changedAt: { gte: startOfMonth, lte: endOfMonth },
        lead: { assignedToId: { not: null } },
      },
      select: { lead: { select: { assignedToId: true } } },
    });

    const achievedMap = new Map<string, number>();
    for (const r of joinedRecords) {
      const id = r.lead.assignedToId as string;
      achievedMap.set(id, (achievedMap.get(id) || 0) + 1);
    }

    const data = salespeople.map((sp) => {
      const t = targetMap.get(sp.id);
      return {
        id: sp.id,
        name: sp.name,
        email: sp.email,
        monthlyTarget: sp.monthlyTarget,
        responseTimeAvg: sp.responseTimeAvg,
        isActive: sp.isActive,
        currentMonthTarget: t?.target ?? sp.monthlyTarget,
        currentMonthAchieved: achievedMap.get(sp.id) ?? 0,
        targetId: t?.id ?? null,
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
    const { userId, month, year, target } = await req.json();
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
        data: { target },
      });
    } else {
      await prisma.salesTarget.create({
        data: { userId, month, year, target },
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
