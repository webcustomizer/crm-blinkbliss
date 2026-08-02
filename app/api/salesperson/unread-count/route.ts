import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["SALESPERSON", "TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  const userId = auth.user.id;
  const role = auth.user.role;

  const settings = await getCachedCRMSettings();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { teamLeaderId: true, createdAt: true, teamAssignedAt: true },
  });

  const hasTeamLeader = !!user?.teamLeaderId;
  const isTL = role === "TEAM_LEAD";

  const messageCheck = isTL
    ? (settings?.tlMessageEnabled !== false)
    : (hasTeamLeader ? (settings?.tlMessageEnabled !== false) : (settings?.messageEnabled !== false));

  const groupCheck = isTL
    ? (settings?.tlGroupChatEnabled !== false)
    : (hasTeamLeader ? (settings?.tlGroupChatEnabled !== false) : (settings?.groupChatEnabled !== false));

  let groupWhere: any = {
    deleted: false,
    senderId: { not: userId },
    groupReads: { none: { userId } },
  };

  if (isTL) {
    groupWhere.chatType = "TL_TEAM";
    groupWhere.teamLeaderId = userId;
  } else if (hasTeamLeader) {
    groupWhere.chatType = "TL_TEAM";
    groupWhere.teamLeaderId = user!.teamLeaderId;
    if (user?.teamAssignedAt) {
      groupWhere.createdAt = { gte: user.teamAssignedAt };
    }
  } else {
    groupWhere.chatType = "GENERAL";
  }

  const [messageUnread, groupUnread, announcementUnread, notificationUnread] = await Promise.all([
    messageCheck
      ? prisma.message.count({
          where: { receiverId: userId, isRead: false },
        }).catch(() => 0)
      : 0,
    groupCheck
      ? prisma.groupMessage.count({
          where: groupWhere,
        }).catch(() => 0)
      : 0,
    prisma.announcement.count({
      where: {
        reads: { none: { userId } },
      },
    }).catch(() => 0),
    prisma.notification.count({
      where: { userId, isRead: false },
    }).catch(() => 0),
  ]);

  return NextResponse.json({
    success: true,
    data: { messages: messageUnread, groupChat: groupUnread, announcements: announcementUnread, notifications: notificationUnread },
  });
}
