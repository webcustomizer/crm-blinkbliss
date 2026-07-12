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

    const start = new Date();

    start.setHours(0, 0, 0, 0);

    const end = new Date();

    end.setHours(23, 59, 59, 999);

    const followUps = await prisma.lead.findMany({
      where: {
        assignedToId: user.id,

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
    console.log("Followup Error:", error);

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
