import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { getPKTDayBoundaryUTC } from "@/lib/format-date";

export const dynamic = "force-dynamic";


// Pakistan Standard Time = UTC+5 (no daylight saving)
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

    const salespersonId = user.id;

    // Today Start (00:00:00 PKT, converted to correct UTC instant)
    const todayStart = getPKTDayBoundaryUTC(0, false);

    // Today End (23:59:59.999 PKT, converted to correct UTC instant)
    const todayEnd = getPKTDayBoundaryUTC(0, true);

    // Upcoming after 2 days (23:59:59.999 PKT, 2 days from now)
    const twoDaysLater = getPKTDayBoundaryUTC(2, true);

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
          isDeleted: false,
          assignedToId: salespersonId,
        },
      }),

      prisma.lead.count({
        where: {
          isDeleted: false,
          assignedToId: salespersonId,
          status: "NEW",
        },
      }),

      prisma.lead.count({
        where: {
          isDeleted: false,
          assignedToId: salespersonId,
          status: "CALLED",
        },
      }),

      prisma.lead.count({
        where: {
          isDeleted: false,
          assignedToId: salespersonId,
          status: "TRAINING_ATTENDED",
        },
      }),

      prisma.lead.count({
        where: {
          isDeleted: false,
          assignedToId: salespersonId,
          status: "SEAT_RESERVED",
        },
      }),

      prisma.lead.count({
        where: {
          isDeleted: false,
          assignedToId: salespersonId,
          status: "JOINED",
        },
      }),

      prisma.lead.count({
        where: {
          isDeleted: false,
          assignedToId: salespersonId,
          status: "DEAD",
        },
      }),

      // Today's Follow Ups
      prisma.lead.count({
        where: {
          isDeleted: false,
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
          isDeleted: false,
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
          isDeleted: false,
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
