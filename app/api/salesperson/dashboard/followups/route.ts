import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { getPKTDayBoundaryUTC } from "@/lib/format-date";

export const dynamic = "force-dynamic";


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
    const start = getPKTDayBoundaryUTC(0, false);

    // Today End (23:59:59.999 PKT)
    const end = getPKTDayBoundaryUTC(0, true);

    const followUps = await prisma.lead.findMany({
      where: {
        isDeleted: false,
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
