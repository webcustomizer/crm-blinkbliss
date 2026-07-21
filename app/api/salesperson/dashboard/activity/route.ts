import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

    // Last 2 days
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const activities = await prisma.statusHistory.findMany({
      where: {
        changedAt: {
          gte: twoDaysAgo,
        },

        lead: {
          isDeleted: false,
          assignedToId: user.id,
        },
      },

      orderBy: {
        changedAt: "desc",
      },

      take: 20,

      include: {
        lead: {
          select: {
            name: true,
            phone: true,
          },
        },

        changedBy: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      activities,
    });
  } catch (error) {


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
