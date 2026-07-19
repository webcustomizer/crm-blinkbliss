import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const messages = await prisma.message.groupBy({
      by: ["senderId"],
      where: {
        receiverId: auth.user.id,
        isRead: false,
      },
      _count: { id: true },
    });

    const counts: Record<string, number> = {};
    for (const m of messages) {
      counts[m.senderId] = m._count.id;
    }

    return NextResponse.json({ success: true, data: counts });
  } catch {
    return NextResponse.json(
      { success: false, data: {} },
      { status: 500 },
    );
  }
}
