import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;
  const user = auth.user;

  try {
    const { id } = await params;
    const { status, remarks } = await req.json();

    if (!status) return NextResponse.json({ success: false, message: "Status required." }, { status: 400 });

    if (!remarks?.trim()) {
      return NextResponse.json({ success: false, message: "Remarks are required before changing status." }, { status: 400 });
    }

    const teamMemberIds = (
      await prisma.user.findMany({ where: { teamLeaderId: user.id }, select: { id: true } })
    ).map((u) => u.id);
    const allIds = [user.id, ...teamMemberIds];

    const lead = await prisma.lead.findFirst({
      where: { id, isDeleted: false, assignedToId: { in: allIds } },
      select: { id: true, status: true, name: true, phone: true },
    });

    if (!lead) return NextResponse.json({ success: false, message: "Lead not found." }, { status: 404 });

    const statusChanged = lead.status !== status;

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id }, data: { status } });
      if (remarks?.trim()) {
        await tx.followUp.create({
          data: { leadId: id, userId: user.id, remarks: remarks.trim(), followUpNumber: 0 },
        });
      }
      if (statusChanged) {
        await tx.statusHistory.create({
          data: { leadId: id, oldStatus: lead.status, newStatus: status, changedById: user.id },
        });
      }
    });

    return NextResponse.json({ success: true, message: "Status updated." });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}
