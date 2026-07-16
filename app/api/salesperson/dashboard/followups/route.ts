import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// Pakistan Standard Time = UTC+5 (no daylight saving)
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * Returns a UTC Date object that represents the start or end of TODAY
 * in PKT, correctly converted back to UTC for DB comparisons.
 */
function getPKTDayBoundary(daysOffset: number, endOfDay: boolean): Date {
  const pktNow = new Date(Date.now() + PKT_OFFSET_MS);

  const year = pktNow.getUTCFullYear();
  const month = pktNow.getUTCMonth();
  const day = pktNow.getUTCDate() + daysOffset;

  const boundaryInPKT = endOfDay
    ? new Date(Date.UTC(year, month, day, 23, 59, 59, 999))
    : new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

  return new Date(boundaryInPKT.getTime() - PKT_OFFSET_MS);
}

export async function GET() {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const user = await verifyToken(token);

    if (user.role !== "SALESPERSON") {
      return NextResponse.json(
        {
          message: "Access denied",
        },
        {
          status: 403,
        },
      );
    }

    // Today Start (00:00:00 PKT)
    const start = getPKTDayBoundary(0, false);

    // Today End (23:59:59.999 PKT)
    const end = getPKTDayBoundary(0, true);

    const followUps = await prisma.lead.findMany({
      where: {
        assignedToId: user.id,

        // Keep this identical to the stats API
        status: {
          notIn: ["JOINED", "DEAD"],
        },

        nextFollowUp: {
          gte: start,
          lte: end,
        },
      },

      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        remarks: true,
        nextFollowUp: true,
      },

      orderBy: {
        nextFollowUp: "asc",
      },
    });

    return NextResponse.json({
      followUps,
    });
  } catch (error) {
    console.error("Followup Error:", error);

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
