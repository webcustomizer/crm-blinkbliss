import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { broadcastNewGroupMessage } from "@/lib/realtime";
import { sendPushNotification } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const settings = await prisma.cRMSetting.findFirst();
    if (!settings?.groupChatEnabled) {
      return NextResponse.json(
        { success: false, message: "Group chat is disabled by admin." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor"); // oldest message id currently loaded
    const PAGE_SIZE = 30;

    const messages = await prisma.groupMessage.findMany({
      where: { deleted: false },
      orderBy: { createdAt: "desc" }, // newest first for pagination
      take: PAGE_SIZE,
      ...(cursor && {
        skip: 1, // cursor record khud skip karo
        cursor: { id: cursor },
      }),
      include: {
        sender: { select: { id: true, name: true, role: true } },
        lead: { select: { id: true, name: true, phone: true } },
        groupReads: { select: { userId: true, readAt: true } },
      },
    });

    const users = await prisma.user.findMany({
      where: { isActive: true },
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
      .reverse(); // UI ke liye oldest→newest order

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
    const settings = await prisma.cRMSetting.findFirst();
    if (!settings?.groupChatEnabled) {
      return NextResponse.json(
        { success: false, message: "Group chat is disabled." },
        { status: 403 },
      );
    }

    const { content, leadId, fileUrl, fileName, fileSize } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, message: "Content is required." },
        { status: 400 },
      );
    }

    const message = await prisma.groupMessage.create({
      data: {
        senderId: auth.user.id,
        content,
        leadId: leadId || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        lead: { select: { id: true, name: true, phone: true } },
      },
    });

    const result = { ...message, reads: [] };

    // Broadcast via Supabase Realtime — response se pehle guaranteed deliver hone dein
    await broadcastNewGroupMessage(result);

    // Push notifications to all active users except sender
    const senderName = (await prisma.user.findUnique({ where: { id: auth.user.id }, select: { name: true } }))?.name || "Admin";
    const allUsers = await prisma.user.findMany({
      where: { isActive: true, id: { not: auth.user.id } },
      select: { id: true },
    });
    if (allUsers.length > 0) {
      Promise.all(
        allUsers.map((u) =>
          sendPushNotification({
            userId: u.id,
            title: `Team Chat — ${senderName}`,
            message: content.length > 100 ? content.slice(0, 100) + "…" : content,
            link: `/admin/group-chat`,
          }),
        ),
      ).catch(() => {});
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
    const { messageIds, markAll } = await req.json();

    if (markAll) {
      const unreadMessages = await prisma.groupMessage.findMany({
        where: {
          deleted: false,
          senderId: { not: auth.user.id },
          groupReads: { none: { userId: auth.user.id } },
        },
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
    await prisma.groupReadReceipt.deleteMany({});
    await prisma.groupMessage.deleteMany({ where: { deleted: false } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to delete messages." },
      { status: 500 },
    );
  }
}
