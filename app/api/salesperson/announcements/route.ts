import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

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
    console.error("Failed to fetch salesperson announcements:", error);

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
    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

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
