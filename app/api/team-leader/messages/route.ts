import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { broadcastNewMessage } from "@/lib/realtime";
import { sendPushNotification } from "@/lib/push";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const settings = await getCachedCRMSettings();
    if (settings?.tlMessageEnabled === false) {
      return NextResponse.json({ success: false, message: "Messages disabled by admin." }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contactId") || searchParams.get("userId") || "";
    const query = searchParams.get("query") || "";
    const searchQuery = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
    const skip = (page - 1) * limit;

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
      return NextResponse.json({ success: true, data: messages, searchResults: true, admins: [] });
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

    let messages;
    let hasMore = false;
    if (contactId) {
      const msgs = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: auth.user.id, receiverId: contactId },
            { senderId: contactId, receiverId: auth.user.id },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        ...(searchParams.get("cursor") && { skip: 1, cursor: { id: searchParams.get("cursor")! } }),
        include: {
          sender: { select: { id: true, name: true } },
          lead: { select: { id: true, name: true, phone: true } },
        },
      });
      hasMore = msgs.length === limit;
      messages = msgs.reverse();

      await prisma.message.updateMany({
        where: { receiverId: auth.user.id, senderId: contactId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
    } else {
      const where = { OR: [{ senderId: auth.user.id }, { receiverId: auth.user.id }] };
      messages = await prisma.message.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          sender: { select: { id: true, name: true } },
          receiver: { select: { id: true, name: true } },
          lead: { select: { id: true, name: true, phone: true } },
        },
        take: 100,
      });
    }

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true, name: true, phone: true },
    });

    const unreadCount = await prisma.message.count({
      where: { receiverId: auth.user.id, isRead: false },
    });

    return NextResponse.json({ success: true, data: messages || [], admins, unreadCount, hasMore });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const settings = await getCachedCRMSettings();
    if (settings?.tlMessageEnabled === false) {
      return NextResponse.json({ success: false, message: "Messages disabled by admin." }, { status: 403 });
    }

    const { content, receiverId, leadId, fileUrl, fileName, fileSize } = await req.json();
    if (!content || !receiverId) return NextResponse.json({ success: false, message: "content and receiverId required." }, { status: 400 });

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, role: true, isActive: true },
    });
    if (!receiver || !receiver.isActive || receiver.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Invalid receiver." }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderId: auth.user.id,
        receiverId,
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

    const ids = [auth.user.id, receiverId].sort();
    const channelKey = `${ids[0]}:${ids[1]}`;
    await broadcastNewMessage(channelKey, message);

    const senderName = auth.user.name || "Team Leader";
    after(() => sendPushNotification({
      userId: receiverId,
      title: senderName,
      message: content.length > 100 ? content.slice(0, 100) + "…" : content,
      link: `/admin/messages`,
    }).catch((err) => console.error("TL message push failed:", err)));

    await logActivity({
      userId: auth.user.id, action: ActivityAction.MESSAGE_SENT,
      description: `${senderName} sent a message`,
      metadata: { receiverId, hasFile: !!fileUrl },
    });

    return NextResponse.json({ success: true, data: message });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const { messageIds } = await req.json();
    if (!messageIds || !Array.isArray(messageIds)) return NextResponse.json({ success: false, message: "messageIds required." }, { status: 400 });

    await prisma.message.updateMany({
      where: { id: { in: messageIds }, receiverId: auth.user.id },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}