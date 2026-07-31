import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead || lead.isDeleted) {
      return NextResponse.json({ success: false, message: "Lead not found." }, { status: 404 });
    }

    const teamMemberIds = (
      await prisma.user.findMany({
        where: { teamLeaderId: auth.user.id },
        select: { id: true },
      })
    ).map((u) => u.id);

    if (lead.assignedToId !== auth.user.id && !teamMemberIds.includes(lead.assignedToId || "")) {
      return NextResponse.json({ success: false, message: "Lead is not assigned to you or your team." }, { status: 403 });
    }

    if (lead.status === "JOINED" || lead.status === "DEAD") {
      return NextResponse.json({ success: false, message: `Cannot reassign a ${lead.status.toLowerCase()} lead.` }, { status: 400 });
    }

    await prisma.notification.deleteMany({ where: { leadId: id } });
    await prisma.lead.update({ where: { id }, data: { assignedToId: auth.user.id } });

    return NextResponse.json({ success: true, message: "Lead unassigned back to you." });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to unassign." }, { status: 500 });
  }
}
