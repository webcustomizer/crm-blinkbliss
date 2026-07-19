import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

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

    // Last 2 days
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const activities = await prisma.statusHistory.findMany({
      where: {
        changedAt: {
          gte: twoDaysAgo,
        },

        lead: {
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
