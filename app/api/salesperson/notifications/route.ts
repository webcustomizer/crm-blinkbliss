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

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    });

    return NextResponse.json({
      notifications,

      unreadCount,
    });
  } catch (error) {
    console.log("Notifications Error:", error);

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

// patch notification as read
export async function PATCH() {
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

    await prisma.notification.updateMany({
      where: {
        userId: user.id,

        isRead: false,
      },

      data: {
        isRead: true,
      },
    });

    return NextResponse.json({
      success: true,

      message: "All notifications marked as read",
    });
  } catch (error) {
    console.log("Mark all read error:", error);

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
