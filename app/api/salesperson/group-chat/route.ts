import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { requireAuth } from "@/lib/require-auth";
import { broadcastNewGroupMessage } from "@/lib/realtime";
import { sendPushNotification } from "@/lib/push";

export const dynamic = "force-dynamic";

async function getChatTypeForUser(userId: string): Promise<"GENERAL" | "TL_TEAM"> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { teamLeaderId: true },
  });
  return user?.teamLeaderId ? "TL_TEAM" : "GENERAL";
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["SALESPERSON"]);
  if ("error" in auth) return auth.error;

  try {
    const settings = await getCachedCRMSettings();
    const chatType = await getChatTypeForUser(auth.user.id);

    const settingCheck = chatType === "TL_TEAM"
      ? (settings?.tlGroupChatEnabled ?? true)
      : (settings?.groupChatEnabled ?? true);
    if (!settingCheck) {
      return NextResponse.json(
        { success: false, message: "Group chat is disabled." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const cursor = searchParams.get("cursor");
    const PAGE_SIZE = 30;

    if (query && query.length >= 2) {
      const leads = await prisma.lead.findMany({
        where: {
          assignedToId: auth.user.id,
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

    const currentUser = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { createdAt: true, teamLeaderId: true, teamAssignedAt: true },
    });

    const messages = await prisma.groupMessage.findMany({
      where: {
        chatType,
        deleted: false,
        ...(chatType === "TL_TEAM" && currentUser?.teamLeaderId ? { teamLeaderId: currentUser.teamLeaderId } : {}),
        ...(currentUser?.teamAssignedAt ? { createdAt: { gte: currentUser.teamAssignedAt } } : {}),
      },
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

    const teamLeaderId = (await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { teamLeaderId: true },
    }))?.teamLeaderId;

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { id: auth.user.id },
          ...(chatType === "TL_TEAM" && teamLeaderId
            ? [{ id: teamLeaderId }, { teamLeaderId }, { role: "ADMIN" as const }]
            : [{ role: "ADMIN" as const }, { role: "SALESPERSON" as const, teamLeaderId: null }]),
        ],
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
      { success: false, message: "Failed to fetch." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["SALESPERSON"]);
  if ("error" in auth) return auth.error;

  try {
    const settings = await getCachedCRMSettings();
    const chatType = await getChatTypeForUser(auth.user.id);

    const settingCheck = chatType === "TL_TEAM"
      ? (settings?.tlGroupChatEnabled ?? true)
      : (settings?.groupChatEnabled ?? true);
    if (!settingCheck) {
      return NextResponse.json(
        { success: false, message: "Group chat is disabled." },
        { status: 403 },
      );
    }

    const { content, leadId, fileUrl, fileName, fileSize, replyToId } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, message: "Content is required." },
        { status: 400 },
      );
    }

    const postUser = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { teamLeaderId: true },
    });

    const message = await prisma.groupMessage.create({
      data: {
        senderId: auth.user.id,
        chatType,
        teamLeaderId: chatType === "TL_TEAM" ? postUser?.teamLeaderId || null : null,
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

    const pushRecipients = await prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: auth.user.id },
        ...(chatType === "GENERAL"
          ? { OR: [{ role: "ADMIN" }, { teamLeaderId: null, role: "SALESPERSON" }] }
          : postUser?.teamLeaderId
            ? {
                OR: [
                  { role: "ADMIN" },
                  { id: postUser.teamLeaderId, role: "TEAM_LEAD" },
                  { teamLeaderId: postUser.teamLeaderId, role: "SALESPERSON" },
                ],
              }
            : {
                OR: [
                  { role: "ADMIN" },
                  { role: "TEAM_LEAD" },
                  { teamLeaderId: { not: null }, role: "SALESPERSON" },
                ],
              }),
      },
      select: { id: true, role: true },
    });
    if (pushRecipients.length > 0) {
      after(() => Promise.allSettled(
        pushRecipients.map((u) =>
          sendPushNotification({
            userId: u.id,
            title: `Team Chat — ${auth.user.name}`,
            message: content.length > 100 ? content.slice(0, 100) + "…" : content,
            link: u.role === "ADMIN" ? "/admin/group-chat" : "/sales/group-chat",
          }),
        ),
      ).then((results) => {
        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length > 0) console.error("SP group-chat push failures:", failures.length);
      }));
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
  const auth = await requireAuth(req, ["SALESPERSON"]);
  if ("error" in auth) return auth.error;

  try {
    const chatType = await getChatTypeForUser(auth.user.id);
    const { messageIds, markAll } = await req.json();

    const patchUser = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { teamLeaderId: true },
    });

    const markWhere: any = {
      chatType,
      deleted: false,
      senderId: { not: auth.user.id },
      groupReads: { none: { userId: auth.user.id } },
    };
    if (chatType === "TL_TEAM" && patchUser?.teamLeaderId) {
      markWhere.teamLeaderId = patchUser.teamLeaderId;
    }

    if (markAll) {
      const unreadMessages = await prisma.groupMessage.findMany({
        where: markWhere,
        select: { id: true },
      });
      if (unreadMessages.length > 0) {
        await prisma.groupReadReceipt.createMany({
          data: unreadMessages.map((msg) => ({
            messageId: msg.id,
            userId: auth.user.id,
          })),
          skipDuplicates: true,
        });
      }
      return NextResponse.json({ success: true, marked: unreadMessages.length });
    }

    if (!messageIds?.length) return NextResponse.json({ success: true });

    await prisma.groupReadReceipt.createMany({
      data: messageIds.map((msgId: string) => ({
        messageId: msgId,
        userId: auth.user.id,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed." },
      { status: 500 },
    );
  }
}
