import { NextRequest, NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/push";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { ActivityAction } from "@/app/generated/prisma/client";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

    const body = await req.json();

    const title = body.title?.trim();

    const message = body.message?.trim();

    if (!title) {
      return NextResponse.json(
        {
          message: "Title is required",
        },
        {
          status: 400,
        },
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          message: "Message is required",
        },
        {
          status: 400,
        },
      );
    }

    const salespersons = await prisma.user.findMany({
      where: {
        role: "SALESPERSON",
        isActive: true,
      },

      select: {
        id: true,
      },
    });

    const announcement = await prisma.$transaction(async (tx) => {
      const announcement = await tx.announcement.create({
        data: {
          title,
          message,
          createdById: user.id,
        },
      });

      if (salespersons.length > 0) {
        await tx.notification.createMany({
          data: salespersons.map((salesperson) => ({
            userId: salesperson.id,
            title: "📢 New Announcement",
            message: title,
            announcementId: announcement.id,
            link: `/sales/announcements?announcementId=${announcement.id}`,
          })),
        });
      }

      return announcement;
    });

    // ADD THIS:
    if (salespersons.length > 0) {
      await Promise.all(
        salespersons.map((salesperson) =>
          sendPushNotification({
            userId: salesperson.id,
            title: "📢 New Announcement",
            message: title,
            link: `/sales/announcements?announcementId=${announcement.id}`,
          }),
        ),
      );
    }

    await logActivity({
      userId: user.id,
      action: ActivityAction.ANNOUNCEMENT_CREATED,
      description: `${user.name} published an announcement`,
      metadata: {
        announcementId: announcement.id,
        title,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Announcement published successfully.",
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

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

    const announcements = await prisma.announcement.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: announcements,
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
