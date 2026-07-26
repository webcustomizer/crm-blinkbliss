import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        createdBy: { select: { id: true, name: true } },
        reads: { where: { userId: auth.user.id }, select: { id: true } },
      },
    });

    const data = announcements.map((a) => ({
      id: a.id, title: a.title, message: a.message, isPinned: a.isPinned,
      createdAt: a.createdAt.toISOString(),
      createdBy: a.createdBy,
      isRead: a.reads.length > 0,
    }));

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const { announcementIds } = await req.json();
    if (!Array.isArray(announcementIds) || announcementIds.length === 0) {
      return NextResponse.json({ message: "No announcements provided" }, { status: 400 });
    }

    await prisma.announcementRead.createMany({
      data: announcementIds.map((id: string) => ({ announcementId: id, userId: auth.user.id })),
      skipDuplicates: true,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}