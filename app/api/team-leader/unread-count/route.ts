import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const [messages, announcements] = await Promise.all([
      prisma.message.count({ where: { receiverId: auth.user.id, isRead: false } }),
      prisma.announcementRead.count({ where: { userId: auth.user.id } }),
    ]);

    const totalAnnouncements = await prisma.announcement.count();
    const unreadAnnouncements = Math.max(0, totalAnnouncements - announcements);

    return NextResponse.json({
      success: true,
      data: { messages, groupChat: 0, announcements: unreadAnnouncements },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}