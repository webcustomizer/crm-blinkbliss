import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

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
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

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
