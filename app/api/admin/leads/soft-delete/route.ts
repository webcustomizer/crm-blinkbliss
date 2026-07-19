import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;
  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, message: "No lead IDs." }, { status: 400 });
    }
    await prisma.lead.updateMany({
      where: { id: { in: ids } },
      data: { isDeleted: true, deletedAt: new Date(), deletedById: auth.user.id },
    });
    await logActivity({
      userId: auth.user.id, action: ActivityAction.LEAD_SOFT_DELETED,
      description: `Soft deleted ${ids.length} leads`, metadata: { ids },
    });
    return NextResponse.json({ success: true, message: `${ids.length} leads moved to trash.` });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;
  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, message: "No lead IDs." }, { status: 400 });
    }
    await prisma.lead.updateMany({
      where: { id: { in: ids }, isDeleted: true },
      data: { isDeleted: false, deletedAt: null, deletedById: null },
    });
    await logActivity({
      userId: auth.user.id, action: ActivityAction.LEAD_RESTORED,
      description: `Restored ${ids.length} leads`, metadata: { ids },
    });
    return NextResponse.json({ success: true, message: `${ids.length} leads restored.` });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}
