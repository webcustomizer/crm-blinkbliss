import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { requireAuth } from "@/lib/require-auth";
import { broadcastNewGroupMessage } from "@/lib/realtime";
import { sendPushNotification } from "@/lib/push";
import { GroupChatType, Role } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const cursor = searchParams.get("cursor");
    const chatType = (searchParams.get("chatType") || "GENERAL") as GroupChatType;
    const teamLeaderId = searchParams.get("teamLeaderId");
    const conversations = searchParams.get("conversations") === "true";

    const settings = await getCachedCRMSettings();
    const chatSetting = chatType === "TL_TEAM" ? settings?.tlGroupChatEnabled : settings?.groupChatEnabled;
    if ((chatSetting ?? true) === false) {
      return NextResponse.json(
        { success: false, message: "Group chat is disabled by admin." },
        { status: 403 },
      );
    }

    if (conversations) {
      const teamLeaders = await prisma.user.findMany({
        where: { role: Role.TEAM_LEAD as Role, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

      const conversations = await Promise.all(
        teamLeaders.map(async (tl) => {
          const lastMessage = await prisma.groupMessage.findFirst({
            where: { chatType: "TL_TEAM", teamLeaderId: tl.id, deleted: false },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              content: true,
              createdAt: true,
              sender: { select: { id: true, name: true } },
            },
          });

          const unreadCount = await prisma.groupMessage.count({
            where: {
              chatType: "TL_TEAM",
              teamLeaderId: tl.id,
              deleted: false,
              senderId: { not: auth.user.id },
              groupReads: { none: { userId: auth.user.id } },
            },
          });

          const memberCount = await prisma.user.count({
            where: { teamLeaderId: tl.id, role: Role.SALESPERSON as Role, isActive: true },
          });

          return {
            teamLeader: tl,
            lastMessage,
            unreadCount,
            memberCount,
          };
        }),
      );

      conversations.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
      });

      return NextResponse.json({ success: true, conversations });
    }

    const PAGE_SIZE = 30;

    if (query && query.length >= 2) {
      const leads = await prisma.lead.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { phone: { contains: query } },
          ],
        },
        select: { id: true, name: true, phone: true },
        take: 10,
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ success: true, leads });
    }

    const where: any = { chatType, deleted: false };
    if (chatType === "TL_TEAM" && teamLeaderId) {
      where.teamLeaderId = teamLeaderId;
    }

    const messages = await prisma.groupMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      include: {
        sender: { select: { id: true, name: true, role: true } },
        lead: { select: { id: true, name: true, phone: true } },
        groupReads: { select: { userId: true, readAt: true } },
        replyTo: {
          select: { id: true, content: true, senderId: true, fileUrl: true, fileName: true, sender: { select: { id: true, name: true } } },
        },
      },
    });

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: chatType === "GENERAL"
          ? [{ role: Role.ADMIN as Role }, { role: Role.SALESPERSON as Role, teamLeaderId: null }]
          : teamLeaderId
            ? [
                { id: teamLeaderId, role: Role.TEAM_LEAD as Role },
                { teamLeaderId, role: Role.SALESPERSON as Role },
                { role: Role.ADMIN as Role },
              ]
            : [{ role: Role.ADMIN as Role }, { role: Role.TEAM_LEAD as Role }, { role: Role.SALESPERSON as Role, teamLeaderId: { not: null } }],
      },
      select: { id: true, name: true, role: true },
    });

    const data = messages
      .map((m) => ({
        ...m,
        reads: m.groupReads.map((r) => ({
          userId: r.userId,
          userName: users.find((u) => u.id === r.userId)?.name || "Unknown",
          readAt: r.readAt.toISOString(),
        })),
      }))
      .reverse();

    return NextResponse.json({
      success: true,
      data,
      hasMore: messages.length === PAGE_SIZE,
      users,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch group messages." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { content, leadId, fileUrl, fileName, fileSize, replyToId, chatType: bodyChatType, teamLeaderId: bodyTeamLeaderId } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, message: "Content is required." },
        { status: 400 },
      );
    }

    const settings = await getCachedCRMSettings();
    const chatSetting = bodyChatType === "TL_TEAM" ? settings?.tlGroupChatEnabled : settings?.groupChatEnabled;
    if ((chatSetting ?? true) === false) {
      return NextResponse.json(
        { success: false, message: "Group chat is disabled." },
        { status: 403 },
      );
    }

    const messageChatType = (bodyChatType || "GENERAL") as GroupChatType;

    const message = await prisma.groupMessage.create({
      data: {
        senderId: auth.user.id,
        chatType: messageChatType,
        teamLeaderId: messageChatType === "TL_TEAM" ? (bodyTeamLeaderId || null) : null,
        content,
        leadId: leadId || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        replyToId: replyToId || null,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        lead: { select: { id: true, name: true, phone: true } },
        replyTo: {
          select: { id: true, content: true, senderId: true, fileUrl: true, fileName: true, sender: { select: { id: true, name: true } } },
        },
      },
    });

    const result = { ...message, reads: [] };

    await broadcastNewGroupMessage(result);

    const senderName = (await prisma.user.findUnique({ where: { id: auth.user.id }, select: { name: true } }))?.name || "Admin";

    let pushWhere: any = { isActive: true, id: { not: auth.user.id } };
    if (messageChatType === GroupChatType.GENERAL) {
      pushWhere.OR = [{ role: Role.ADMIN as Role }, { role: Role.SALESPERSON as Role, teamLeaderId: null }];
    } else if (bodyTeamLeaderId) {
      pushWhere.OR = [
        { id: bodyTeamLeaderId, role: Role.TEAM_LEAD as Role },
        { teamLeaderId: bodyTeamLeaderId, role: Role.SALESPERSON as Role },
        { role: Role.ADMIN as Role },
      ];
    } else {
      pushWhere.OR = [{ role: Role.ADMIN as Role }, { role: Role.TEAM_LEAD as Role }, { role: Role.SALESPERSON as Role, teamLeaderId: { not: null } }];
    }

    const pushUsers = await prisma.user.findMany({
      where: pushWhere,
      select: { id: true, role: true },
    });
    if (pushUsers.length > 0) {
      after(() => Promise.all(
        pushUsers.map((u) =>
          sendPushNotification({
            userId: u.id,
            title: `Team Chat — ${senderName}`,
            message: content.length > 100 ? content.slice(0, 100) + "…" : content,
            link: u.role === "ADMIN" ? "/admin/group-chat" : u.role === "TEAM_LEAD" ? "/team-leader/group-chat" : "/sales/group-chat",
          }),
        ),
      ).catch((err) => console.error("Admin group-chat push failed:", err)));
    }

    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to send." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const chatType = (searchParams.get("chatType") || "GENERAL") as GroupChatType;
    const teamLeaderId = searchParams.get("teamLeaderId");
    const { messageIds, markAll } = await req.json();

    const where: any = { chatType, deleted: false, senderId: { not: auth.user.id }, groupReads: { none: { userId: auth.user.id } } };
    if (chatType === "TL_TEAM" && teamLeaderId) {
      where.teamLeaderId = teamLeaderId;
    }

    if (markAll) {
      const unreadMessages = await prisma.groupMessage.findMany({
        where,
        select: { id: true },
      });
      for (const msg of unreadMessages) {
        await prisma.groupReadReceipt.upsert({
          where: { messageId_userId: { messageId: msg.id, userId: auth.user.id } },
          create: { messageId: msg.id, userId: auth.user.id },
          update: { readAt: new Date() },
        });
      }
      return NextResponse.json({ success: true, marked: unreadMessages.length });
    }

    if (!messageIds?.length) return NextResponse.json({ success: true });

    for (const msgId of messageIds) {
      await prisma.groupReadReceipt.upsert({
        where: { messageId_userId: { messageId: msgId, userId: auth.user.id } },
        create: { messageId: msgId, userId: auth.user.id },
        update: { readAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to mark as read." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const chatType = (searchParams.get("chatType") || "GENERAL") as GroupChatType;
    const teamLeaderId = searchParams.get("teamLeaderId");

    const where: any = { chatType, deleted: false };
    if (chatType === "TL_TEAM" && teamLeaderId) {
      where.teamLeaderId = teamLeaderId;
    }

    await prisma.groupMessage.deleteMany({ where });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to delete messages." },
      { status: 500 },
    );
  }
}
