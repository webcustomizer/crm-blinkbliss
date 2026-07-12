import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { ActivityAction } from "@/app/generated/prisma/client";
import { logActivity } from "@/lib/activity";

export async function POST(req: Request) {
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
          })),
        });
      }

      return announcement;
    });

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
    console.log("Announcement Error:", error);

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
    console.log("Get Announcements Error:", error);

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
