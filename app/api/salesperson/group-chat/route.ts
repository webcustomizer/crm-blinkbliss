import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { requireAuth } from "@/lib/require-auth";
import { broadcastNewGroupMessage } from "@/lib/realtime";
import { sendPushNotification } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["SALESPERSON"]);
  if ("error" in auth) return auth.error;

  try {
    const settings = await getCachedCRMSettings();
    if (!settings?.groupChatEnabled) {
      return NextResponse.json(
        { success: false, message: "Group chat is disabled." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const cursor = searchParams.get("cursor"); // oldest message id currently loaded
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
      select: { createdAt: true },
    });

    const messages = await prisma.groupMessage.findMany({
      where: {
        deleted: false,
        ...(currentUser && { createdAt: { gte: currentUser.createdAt } }),
      },
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

    await broadcastNewGroupMessage(result);

    // Fire-and-forget: push to all active users except sender
    const allUsers = await prisma.user.findMany({
      where: { isActive: true, id: { not: auth.user.id } },
      select: { id: true },
    });
    if (allUsers.length > 0) {
      Promise.allSettled(
        allUsers.map((u) =>
          sendPushNotification({
            userId: u.id,
            title: `Team Chat — ${auth.user.name}`,
            message: content.length > 100 ? content.slice(0, 100) + "…" : content,
            link: `/sales/group-chat`,
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
  const auth = await requireAuth(req, ["SALESPERSON"]);
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
