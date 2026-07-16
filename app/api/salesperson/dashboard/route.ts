import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// Pakistan Standard Time = UTC+5 (no daylight saving)
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * Returns a UTC Date object that represents the start or end of a given
 * PKT calendar day, correctly converted back to UTC for DB comparisons.
 * This works correctly regardless of the server's system timezone
 * (fixes the local-vs-production UTC mismatch bug).
 */
function getPKTDayBoundary(daysOffset: number, endOfDay: boolean): Date {
  // Shift "now" into PKT wall-clock time
  const pktNow = new Date(Date.now() + PKT_OFFSET_MS);

  const year = pktNow.getUTCFullYear();
  const month = pktNow.getUTCMonth();
  const day = pktNow.getUTCDate() + daysOffset;

  const boundaryInPKT = endOfDay
    ? new Date(Date.UTC(year, month, day, 23, 59, 59, 999))
    : new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

  // Convert back to the real UTC instant for Prisma to query against
  return new Date(boundaryInPKT.getTime() - PKT_OFFSET_MS);
}

export async function GET() {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);

    if (user.role !== "SALESPERSON") {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const salespersonId = user.id;

    // Today Start (00:00:00 PKT, converted to correct UTC instant)
    const todayStart = getPKTDayBoundary(0, false);

    // Today End (23:59:59.999 PKT, converted to correct UTC instant)
    const todayEnd = getPKTDayBoundary(0, true);

    // Upcoming after 2 days (23:59:59.999 PKT, 2 days from now)
    const twoDaysLater = getPKTDayBoundary(2, true);

    const [
      totalLeads,
      newLeads,
      calledLeads,
      trainingLeads,
      reservedLeads,
      joinedLeads,
      deadLeads,
      todayFollowUps,
      overdueFollowUps,
      upcomingFollowUps,
    ] = await Promise.all([
      prisma.lead.count({
        where: {
          assignedToId: salespersonId,
        },
      }),

      prisma.lead.count({
        where: {
          assignedToId: salespersonId,
          status: "NEW",
        },
      }),

      prisma.lead.count({
        where: {
          assignedToId: salespersonId,
          status: "CALLED",
        },
      }),

      prisma.lead.count({
        where: {
          assignedToId: salespersonId,
          status: "TRAINING_ATTENDED",
        },
      }),

      prisma.lead.count({
        where: {
          assignedToId: salespersonId,
          status: "SEAT_RESERVED",
        },
      }),

      prisma.lead.count({
        where: {
          assignedToId: salespersonId,
          status: "JOINED",
        },
      }),

      prisma.lead.count({
        where: {
          assignedToId: salespersonId,
          status: "DEAD",
        },
      }),

      // Today's Follow Ups
      prisma.lead.count({
        where: {
          assignedToId: salespersonId,
          status: {
            notIn: ["JOINED", "DEAD"],
          },
          nextFollowUp: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),

      // Overdue Follow Ups
      prisma.lead.count({
        where: {
          assignedToId: salespersonId,
          status: {
            notIn: ["JOINED", "DEAD"],
          },
          nextFollowUp: {
            lt: todayStart,
          },
        },
      }),

      // Upcoming Follow Ups (Next 2 Days)
      prisma.lead.count({
        where: {
          assignedToId: salespersonId,
          status: {
            notIn: ["JOINED", "DEAD"],
          },
          nextFollowUp: {
            gt: todayEnd,
            lte: twoDaysLater,
          },
        },
      }),
    ]);

    const conversionRate =
      totalLeads === 0 ? 0 : Math.round((joinedLeads / totalLeads) * 100);

    return NextResponse.json({
      userId: salespersonId,

      stats: {
        totalLeads,
        newLeads,
        calledLeads,
        trainingLeads,
        reservedLeads,
        joinedLeads,
        deadLeads,
        todayFollowUps,
        overdueFollowUps,
        upcomingFollowUps,
        conversionRate,
      },
    });
  } catch (error) {
    console.error("Sales Dashboard Error:", error);

    return NextResponse.json(
      {
        message: "Something went wrong",
      },
      {
        status: 500,
      },
    );
  }
}
