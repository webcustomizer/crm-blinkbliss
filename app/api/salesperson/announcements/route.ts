import { NextRequest, NextResponse } from "next/server";
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

    const announcements = await prisma.announcement.findMany({
      orderBy: [
        {
          isPinned: "desc",
        },
        {
          createdAt: "desc",
        },
      ],

      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        reads: {
          where: { userId: user.id },
          select: { readAt: true },
        },
      },
    });

    const data = announcements.map((a) => ({
      ...a,
      isRead: a.reads.length > 0,
      reads: undefined,
    }));

    return NextResponse.json({
      data,
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

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const user = await verifyToken(token);
    if (user.role !== "SALESPERSON") return NextResponse.json({ message: "Access denied" }, { status: 403 });

    const { announcementIds } = await req.json();
    if (!Array.isArray(announcementIds) || announcementIds.length === 0) {
      return NextResponse.json({ message: "No announcements provided" }, { status: 400 });
    }

    await prisma.announcementRead.createMany({
      data: announcementIds.map((id: string) => ({
        announcementId: id,
        userId: user.id,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
