import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

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

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          message: "Access denied",
        },
        {
          status: 403,
        },
      );
    }

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
