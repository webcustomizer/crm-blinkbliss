import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

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

export async function DELETE(
  req: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

    const { id } = await context.params;

    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      return NextResponse.json({ message: "Notification not found" }, { status: 404 });
    }

    if (notification.userId !== user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await prisma.notification.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
