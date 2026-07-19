import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ success: false, message: "Not found." }, { status: 404 });
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });
    await logActivity({
      userId: auth.user.id,
      action: ActivityAction.USER_STATUS_CHANGED as any,
      description: `${auth.user.name} ${updated.isActive ? "activated" : "deactivated"} ${updated.name}`,
      metadata: { targetUserId: id, isActive: updated.isActive },
    });
    return NextResponse.json({ success: true, isActive: updated.isActive });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}
