import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;
  try {
    const { targetId, sourceId } = await req.json();
    if (!targetId || !sourceId || targetId === sourceId) {
      return NextResponse.json({ success: false, message: "Invalid lead IDs." }, { status: 400 });
    }
    const target = await prisma.lead.findUnique({ where: { id: targetId } });
    const source = await prisma.lead.findUnique({ where: { id: sourceId } });
    if (!target || !source) {
      return NextResponse.json({ success: false, message: "Lead not found." }, { status: 404 });
    }
    await prisma.$transaction([
      prisma.followUp.updateMany({ where: { leadId: sourceId }, data: { leadId: targetId } }),
      prisma.statusHistory.updateMany({ where: { leadId: sourceId }, data: { leadId: targetId } }),
      prisma.activityLog.updateMany({ where: { leadId: sourceId }, data: { leadId: targetId } }),
      prisma.message.updateMany({ where: { leadId: sourceId }, data: { leadId: targetId } }),
      prisma.groupMessage.updateMany({ where: { leadId: sourceId }, data: { leadId: targetId } }),
      prisma.lead.update({
        where: { id: sourceId },
        data: { mergedIntoId: targetId, isDeleted: true, deletedAt: new Date(), deletedById: auth.user.id },
      }),
    ]);
    await logActivity({
      userId: auth.user.id, action: ActivityAction.LEAD_MERGED,
      description: `Merged ${source.name || source.phone} into ${target.name || target.phone}`,
      metadata: { targetId, sourceId },
    });
    return NextResponse.json({ success: true, message: "Leads merged.", data: target });
  } catch {
    return NextResponse.json({ success: false, message: "Merge failed." }, { status: 500 });
  }
}
