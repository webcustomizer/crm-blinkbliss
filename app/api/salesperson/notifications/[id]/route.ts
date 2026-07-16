import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function PATCH(
  req: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
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

    const { id } = await context.params;

    const notification = await prisma.notification.findUnique({
      where: {
        id,
      },
    });

    if (!notification) {
      return NextResponse.json(
        {
          message: "Notification not found",
        },
        {
          status: 404,
        },
      );
    }

    // Security check
    // User sirf apni notification read kar sakta hai

    if (notification.userId !== user.id) {
      return NextResponse.json(
        {
          message: "Forbidden",
        },
        {
          status: 403,
        },
      );
    }

    const updatedNotification = await prisma.notification.update({
      where: {
        id,
      },

      data: {
        isRead: true,
      },
    });

    return NextResponse.json({
      success: true,

      notification: updatedNotification,
    });
  } catch (error) {
    console.log("Mark notification error:", error);

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
