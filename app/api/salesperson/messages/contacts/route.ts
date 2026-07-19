import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["SALESPERSON"]);
  if ("error" in auth) return auth.error;

  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        sentMessages: {
          where: { receiverId: auth.user.id },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
        receivedMessages: {
          where: { senderId: auth.user.id },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    const contacts = admins
      .map((admin) => {
        const lastSent = admin.sentMessages[0]?.createdAt;
        const lastReceived = admin.receivedMessages[0]?.createdAt;
        const lastMessageAt = lastSent && lastReceived
          ? (lastSent > lastReceived ? lastSent : lastReceived)
          : lastSent || lastReceived || null;
        return {
          id: admin.id,
          name: admin.name,
          phone: admin.phone,
          role: admin.role,
          lastMessageAt: lastMessageAt?.toISOString() || null,
        };
      })
      .sort((a, b) => {
        if (!a.lastMessageAt && !b.lastMessageAt) return 0;
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });

    return NextResponse.json({ success: true, data: contacts });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}
