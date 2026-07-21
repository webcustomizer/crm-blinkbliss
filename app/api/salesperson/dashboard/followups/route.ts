import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { getPKTDayBoundaryUTC } from "@/lib/format-date";

export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

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
