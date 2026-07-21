import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { getPKTDayBoundaryUTC } from "@/lib/format-date";

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const dateFilter = searchParams.get("filter") || "ALL";

    const where: any = { isDeleted: false };

    if (dateFilter !== "ALL") {
      const todayStart = getPKTDayBoundaryUTC(0, false);
      switch (dateFilter) {
        case "TODAY":
          where.createdAt = { gte: todayStart, lte: getPKTDayBoundaryUTC(0, true) };
          break;
        case "WEEK":
          where.createdAt = { gte: new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000) };
          break;
        case "MONTH": {
          const pktNow = new Date(Date.now() + PKT_OFFSET_MS);
          const monthStart = new Date(Date.UTC(pktNow.getUTCFullYear(), pktNow.getUTCMonth(), 1));
          where.createdAt = { gte: new Date(monthStart.getTime() - PKT_OFFSET_MS) };
          break;
        }
      }
    }

    const [statusCounts, salespersonPerf, dateGroups] = await Promise.all([
      prisma.lead.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),

      prisma.lead.groupBy({
        by: ["assignedToId", "status"],
        where,
        _count: true,
      }),

      prisma.lead.findMany({
        where,
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of statusCounts) {
      statusMap[s.status] = s._count;
    }

    const personMap: Record<string, Record<string, number>> = {};
    for (const row of salespersonPerf) {
      if (!row.assignedToId) continue;
      if (!personMap[row.assignedToId]) personMap[row.assignedToId] = {};
      personMap[row.assignedToId][row.status] = row._count;
    }

    let salespersonNames: Record<string, string> = {};
    const personIds = Object.keys(personMap);
    if (personIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: personIds } },
        select: { id: true, name: true },
      });
      for (const u of users) {
        salespersonNames[u.id] = u.name;
      }
    }

    const salespersonReport = personIds.map((id) => {
      const statuses = personMap[id];
      const total = Object.values(statuses).reduce((a, b) => a + b, 0);
      return {
        id,
        name: salespersonNames[id] || "Unknown",
        total,
        called: statuses["CALLED"] || 0,
        followups: statuses["NEED_MORE_FOLLOW_UP"] || 0,
        training: statuses["TRAINING_ATTENDED"] || 0,
        reserved: statuses["SEAT_RESERVED"] || 0,
        joined: statuses["JOINED"] || 0,
        dead: statuses["DEAD"] || 0,
      };
    });

    const dateMap = new Map<string, { total: number; joined: number; dead: number }>();
    for (const l of dateGroups) {
      const d = new Date(l.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!dateMap.has(key)) dateMap.set(key, { total: 0, joined: 0, dead: 0 });
      const entry = dateMap.get(key)!;
      entry.total++;
      if (l.status === "JOINED") entry.joined++;
      if (l.status === "DEAD") entry.dead++;
    }

    const timeSeries = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date: new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" }),
        Leads: v.total,
        Joined: v.joined,
        Dead: v.dead,
      }));

    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      data: {
        total,
        statusCounts: statusMap,
        salespersonReport,
        timeSeries,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to load report stats." },
      { status: 500 },
    );
  }
}
