import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["SALESPERSON"]);
  if ("error" in auth) return auth.error;

  const userId = auth.user.id;

  const settings = await prisma.cRMSetting.findFirst();

  let messageUnread = 0;
  let groupUnread = 0;
  let announcementUnread = 0;

  try {
    if (settings?.messageEnabled !== false) {
      messageUnread = await prisma.message.count({
        where: { receiverId: userId, isRead: false },
      });
    }
  } catch {}

  try {
    if (settings?.groupChatEnabled !== false) {
      groupUnread = await prisma.groupMessage.count({
        where: {
          deleted: false,
          senderId: { not: userId },
          groupReads: { none: { userId } },
        },
      });
    }
  } catch {}

  try {
    announcementUnread = await prisma.announcement.count({
      where: {
        reads: { none: { userId } },
      },
    });
  } catch {}

  return NextResponse.json({
    success: true,
    data: { messages: messageUnread, groupChat: groupUnread, announcements: announcementUnread },
  });
}
