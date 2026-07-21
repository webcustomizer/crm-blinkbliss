import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

    const activities = await prisma.activityLog.findMany({
      orderBy: {
        createdAt: "desc",
      },

      take: 100,

      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },

        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({
      activities,
    });
  } catch (error) {
    console.error("Admin Activity Error:", error);

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
