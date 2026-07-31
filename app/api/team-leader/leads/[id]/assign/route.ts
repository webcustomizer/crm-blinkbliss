import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { notifyBulkAssigned } from "@/lib/notify-bulk-assigned";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  const settings = await getCachedCRMSettings();
  if (settings && settings.tlDistributeEnabled === false) {
    return NextResponse.json(
      { success: false, message: "Lead distribution is disabled by admin." },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;
    const { userId } = await req.json();

    if (!userId) return NextResponse.json({ success: false, message: "userId is required." }, { status: 400 });

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

    const allIds = [auth.user.id, ...teamMemberIds];
    if (!allIds.includes(lead.assignedToId || "")) {
      return NextResponse.json({ success: false, message: "Lead is not assigned to you or your team." }, { status: 403 });
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: userId, teamLeaderId: auth.user.id, role: "SALESPERSON", isActive: true },
    });
    if (!targetUser) return NextResponse.json({ success: false, message: "Target team member not found or not active." }, { status: 404 });

    if (lead.status === "JOINED" || lead.status === "DEAD") {
      return NextResponse.json({ success: false, message: `Cannot assign a ${lead.status.toLowerCase()} lead.` }, { status: 400 });
    }

    if (lead.assignedToId === userId) {
      return NextResponse.json({ success: true, message: "Lead is already assigned to this person." });
    }

    await prisma.lead.update({ where: { id }, data: { assignedToId: userId } });

    await prisma.notification.deleteMany({ where: { leadId: id } });

    const response = NextResponse.json({ success: true, message: "Lead reassigned." });

    const tlName = auth.user.name || "Your team leader";
    after(() => notifyBulkAssigned({ userId, leadCount: 1, assignedByName: tlName, assignedById: auth.user.id }).catch((err) =>
      console.error("❌ Single assign notification failed:", err),
    ));

    return response;
  } catch {
    return NextResponse.json({ success: false, message: "Failed to assign." }, { status: 500 });
  }
}
