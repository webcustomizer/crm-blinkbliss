import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    // TL can chat with admin + own team members
    const teamMemberIds = (
      await prisma.user.findMany({
        where: { teamLeaderId: auth.user.id },
        select: { id: true },
      })
    ).map((u) => u.id);

    const contacts = await prisma.user.findMany({
      where: {
        id: { not: auth.user.id },
        OR: [
          { role: "ADMIN", isActive: true },
          { id: { in: teamMemberIds } },
        ],
      },
      select: {
        id: true, name: true, email: true, phone: true, role: true, isActive: true,
        sentMessages: {
          where: { receiverId: auth.user.id },
          orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true },
        },
        receivedMessages: {
          where: { senderId: auth.user.id },
          orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true },
        },
      },
    });

    const result = contacts.map((c) => {
      const lastSent = c.sentMessages[0]?.createdAt;
      const lastReceived = c.receivedMessages[0]?.createdAt;
      const lastMessageAt = lastSent && lastReceived
        ? (lastSent > lastReceived ? lastSent : lastReceived)
        : lastSent || lastReceived || null;
      return { id: c.id, name: c.name, email: c.email, phone: c.phone, role: c.role, isActive: c.isActive, lastMessageAt: lastMessageAt?.toISOString() || null };
    }).sort((a, b) => {
      if (!a.lastMessageAt && !b.lastMessageAt) return 0;
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}