import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const [messages, groupUnread, announcements] = await Promise.all([
      prisma.message.count({ where: { receiverId: auth.user.id, isRead: false } }),
      prisma.groupMessage.count({
        where: {
          deleted: false,
          senderId: { not: auth.user.id },
          chatType: "TL_TEAM",
          teamLeaderId: auth.user.id,
          groupReads: { none: { userId: auth.user.id } },
        },
      }),
      prisma.announcement.count({ where: { reads: { none: { userId: auth.user.id } } } }),
    ]);

    return NextResponse.json({
      success: true,
      data: { messages, groupChat: groupUnread, announcements },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}
