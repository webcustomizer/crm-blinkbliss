import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { broadcastNewMessage } from "@/lib/realtime";
import { sendPushNotification } from "@/lib/push";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["SALESPERSON"]);
  if ("error" in auth) return auth.error;
  const settings = await prisma.cRMSetting.findFirst();
  if (settings?.messageEnabled === false)
    return NextResponse.json(
      { success: false, message: "Messages disabled by admin." },
      { status: 403 },
    );

  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true, name: true, phone: true },
    });

    const { searchParams } = new URL(req.url);
    const withUserId = searchParams.get("userId") || "";
    const query = searchParams.get("query") || "";
    const searchQuery = searchParams.get("search") || "";

    if (searchQuery && searchQuery.length >= 2) {
      const messages = await prisma.message.findMany({
        where: {
          content: { contains: searchQuery, mode: "insensitive" },
          OR: [{ senderId: auth.user.id }, { receiverId: auth.user.id }],
        },
        orderBy: { createdAt: "desc" },
        include: {
          sender: { select: { id: true, name: true } },
          lead: { select: { id: true, name: true, phone: true } },
        },
        take: 50,
      });
      return NextResponse.json({
        success: true,
        data: messages,
        searchResults: true,
        admins: [],
        unreadCount: 0,
      });
    }

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

    const cursor = searchParams.get("cursor");
    const PAGE_SIZE = 50;

    let messages;
    let hasMore = false;
    if (withUserId) {
      const msgs = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: auth.user.id, receiverId: withUserId },
            { senderId: withUserId, receiverId: auth.user.id },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        ...(cursor && {
          skip: 1,
          cursor: { id: cursor },
        }),
        include: {
          sender: { select: { id: true, name: true } },
          lead: { select: { id: true, name: true, phone: true } },
        },
      });
      hasMore = msgs.length === PAGE_SIZE;
      messages = msgs.reverse();

      await prisma.message.updateMany({
        where: {
          receiverId: auth.user.id,
          senderId: withUserId,
          isRead: false,
        },
        data: { isRead: true, readAt: new Date() },
      });
    }

    const unreadCount = await prisma.message.count({
      where: { receiverId: auth.user.id, isRead: false },
    });

    return NextResponse.json({
      success: true,
      data: messages || [],
      admins,
      unreadCount,
      hasMore,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch messages." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["SALESPERSON"]);
  if ("error" in auth) return auth.error;
  const settings = await prisma.cRMSetting.findFirst();
  if (settings?.messageEnabled === false)
    return NextResponse.json(
      { success: false, message: "Messages disabled by admin." },
      { status: 403 },
    );

  try {
    const { receiverId, content, leadId, fileUrl, fileName, fileSize } =
      await req.json();
    if (!receiverId || !content?.trim()) {
      return NextResponse.json(
        { success: false, message: "Receiver and content are required." },
        { status: 400 },
      );
    }

    const message = await prisma.message.create({
      data: {
        senderId: auth.user.id,
        receiverId,
        content,
        leadId: leadId || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
      },
      include: {
        sender: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true, phone: true } },
      },
    });

    // Broadcast via Supabase Realtime — response se pehle guaranteed deliver hone dein
    const ids = [auth.user.id, receiverId].sort();
    const channelKey = `${ids[0]}:${ids[1]}`;
    await broadcastNewMessage(channelKey, message);

    // Push notification to receiver
    const senderName = (await prisma.user.findUnique({ where: { id: auth.user.id }, select: { name: true } }))?.name || "Salesperson";
    sendPushNotification({
      userId: receiverId,
      title: senderName,
      message: content.length > 100 ? content.slice(0, 100) + "…" : content,
      link: `/admin/messages`,
    }).catch(() => {});

    logActivity({
      userId: auth.user.id,
      leadId: leadId || null,
      action: ActivityAction.MESSAGE_SENT,
      description: `${senderName} sent a message`,
      metadata: { receiverId, hasFile: !!fileUrl },
    }).catch(() => {});

    return NextResponse.json({ success: true, data: message });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to send message." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ["SALESPERSON"]);
  if ("error" in auth) return auth.error;

  try {
    const { messageIds } = await req.json();
    if (!messageIds?.length) return NextResponse.json({ success: true });

    await prisma.message.updateMany({
      where: { id: { in: messageIds }, receiverId: auth.user.id },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to mark as read." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, ["SALESPERSON"]);
  if ("error" in auth) return auth.error;

  try {
    const { withUserId } = await req.json();
    if (withUserId) {
      await prisma.message.deleteMany({
        where: {
          OR: [
            { senderId: auth.user.id, receiverId: withUserId },
            { senderId: withUserId, receiverId: auth.user.id },
          ],
        },
      });
    } else {
      await prisma.message.deleteMany({
        where: {
          OR: [{ senderId: auth.user.id }, { receiverId: auth.user.id }],
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to delete messages." },
      { status: 500 },
    );
  }
}
