import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { getPKTDayBoundaryUTC } from "@/lib/format-date";

// Derived straight from the Prisma client's own method signature, so this
// always matches whatever the generator produces — no separate import of
// `Prisma`/enum types needed (those export names can vary by generator).
type LeadWhereInput = NonNullable<Parameters<typeof prisma.lead.count>[0]>["where"];

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const completionParam = searchParams.get("completion");
    const completionFilter: "COMPLETE" | "INCOMPLETE" | null =
      completionParam === "COMPLETE" || completionParam === "INCOMPLETE"
        ? completionParam
        : null;

    const todayStart = getPKTDayBoundaryUTC(0, false);
    const todayEnd = getPKTDayBoundaryUTC(0, true);
    const whereActive: LeadWhereInput = {
      isDeleted: false,
      ...(completionFilter && { completion: completionFilter }),
    };

    const [
      totalLeads,
      statusCounts,
      todayNewLeads,
      todayJoined,
      todayFollowUps,
      overdueFollowUps,
      topCities,
      topPurposes,
      ageGroups,
      timeSlots,
      trainingInterest,
    ] = await Promise.all([
      prisma.lead.count({ where: whereActive }),

      prisma.lead.groupBy({
        by: ["status"],
        where: whereActive,
        _count: true,
      }),

      prisma.lead.count({
        where: { ...whereActive, createdAt: { gte: todayStart, lte: todayEnd } },
      }),

      prisma.statusHistory.count({
        where: {
          newStatus: "JOINED",
          changedAt: { gte: todayStart, lte: todayEnd },
          lead: { isDeleted: false },
        },
      }),

      prisma.lead.count({
        where: {
          ...whereActive,
          status: { notIn: ["JOINED", "DEAD"] },
          nextFollowUp: { gte: todayStart, lte: todayEnd },
        },
      }),

      prisma.lead.count({
        where: {
          ...whereActive,
          status: { notIn: ["JOINED", "DEAD"] },
          nextFollowUp: { not: null, lt: todayStart },
        },
      }),

      // Grouped via SQL with INITCAP(TRIM(city)) so "Lahore", "lahore",
      // "LAHORE", " Lahore " etc. (free-text field, no dropdown) all merge
      // into one entry instead of showing as separate duplicate rows.
      completionFilter
        ? prisma.$queryRaw<{ name: string; count: bigint }[]>`
            SELECT INITCAP(TRIM(city)) as name, COUNT(*) as count
            FROM "Lead"
            WHERE "isDeleted" = false AND city IS NOT NULL AND TRIM(city) <> ''
              AND "completion" = ${completionFilter}::"LeadCompletion"
            GROUP BY INITCAP(TRIM(city))
            ORDER BY count DESC
            LIMIT 4
          `
        : prisma.$queryRaw<{ name: string; count: bigint }[]>`
            SELECT INITCAP(TRIM(city)) as name, COUNT(*) as count
            FROM "Lead"
            WHERE "isDeleted" = false AND city IS NOT NULL AND TRIM(city) <> ''
            GROUP BY INITCAP(TRIM(city))
            ORDER BY count DESC
            LIMIT 4
          `,

      prisma.lead.groupBy({
        by: ["purpose"],
        where: { ...whereActive, purpose: { not: null } },
        _count: true,
        orderBy: { _count: { purpose: "desc" } },
        take: 4,
      }),

      // Age bucketing via SQL — avoids fetching every lead row into Node
      completionFilter
        ? prisma.$queryRaw<{ bucket: string; count: bigint }[]>`
            SELECT
              CASE
                WHEN age >= 18 AND age <= 25 THEN '18-25'
                WHEN age >= 26 AND age <= 35 THEN '26-35'
                WHEN age > 35 THEN '36+'
              END as bucket,
              COUNT(*) as count
            FROM "Lead"
            WHERE "isDeleted" = false AND age IS NOT NULL
              AND "completion" = ${completionFilter}::"LeadCompletion"
            GROUP BY bucket
          `
        : prisma.$queryRaw<{ bucket: string; count: bigint }[]>`
            SELECT
              CASE
                WHEN age >= 18 AND age <= 25 THEN '18-25'
                WHEN age >= 26 AND age <= 35 THEN '26-35'
                WHEN age > 35 THEN '36+'
              END as bucket,
              COUNT(*) as count
            FROM "Lead"
            WHERE "isDeleted" = false AND age IS NOT NULL
            GROUP BY bucket
          `,

      prisma.lead.groupBy({
        by: ["bestTimeToReach"],
        where: { ...whereActive, bestTimeToReach: { not: null } },
        _count: true,
      }),

      prisma.lead.groupBy({
        by: ["willingToAttendTraining"],
        where: whereActive,
        _count: true,
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of statusCounts) {
      statusMap[s.status] = s._count;
    }

    const ageBuckets: Record<string, number> = { "18-25": 0, "26-35": 0, "36+": 0 };
    for (const row of ageGroups) {
      if (row.bucket && row.bucket in ageBuckets) {
        ageBuckets[row.bucket] = Number(row.count);
      }
    }

    const timeSlotMap: Record<string, number> = {};
    for (const t of timeSlots) {
      if (t.bestTimeToReach) {
        timeSlotMap[t.bestTimeToReach] = t._count;
      }
    }

    const trainingMap: Record<string, number> = {};
    for (const tr of trainingInterest) {
      const key = tr.willingToAttendTraining === true ? "interested" : "notInterested";
      trainingMap[key] = tr._count;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalLeads,
        statusCounts: statusMap,
        todayNewLeads,
        todayJoined,
        todayFollowUps,
        overdueFollowUps,
        topCities: topCities.map((c) => ({ name: c.name, count: Number(c.count) })),
        topPurposes: topPurposes.map((p) => ({ name: p.purpose || "Other", count: p._count })),
        ageGroups: ageBuckets,
        timeSlots: timeSlotMap,
        trainingInterest: trainingMap,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to load dashboard stats." },
      { status: 500 },
    );
  }
}