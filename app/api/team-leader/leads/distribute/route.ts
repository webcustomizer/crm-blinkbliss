import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { notifyBulkAssigned } from "@/lib/notify-bulk-assigned";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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
    const { leadIds, userId } = await req.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ success: false, message: "leadIds required." }, { status: 400 });
    }
    if (!userId) return NextResponse.json({ success: false, message: "userId required." }, { status: 400 });

    // Verify target user is in TL's team
    const member = await prisma.user.findFirst({
      where: { id: userId, teamLeaderId: auth.user.id, role: "SALESPERSON", isActive: true },
    });
    if (!member) return NextResponse.json({ success: false, message: "Team member not found." }, { status: 404 });

    // Verify all leads belong to TL or their team
    const teamMemberIds = (
      await prisma.user.findMany({
        where: { teamLeaderId: auth.user.id },
        select: { id: true },
      })
    ).map((u) => u.id);

    const allIds = [auth.user.id, ...teamMemberIds];

    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds }, assignedToId: { in: allIds }, isDeleted: false },
    });
    if (leads.length !== leadIds.length) {
      return NextResponse.json({ success: false, message: "Some leads not found or not in your team." }, { status: 400 });
    }

    const alreadyAssigned = leads.filter((l) => l.assignedToId === userId).map((l) => l.id);
    const toAssign = leads.filter((l) => l.assignedToId !== userId);

    if (toAssign.length === 0) {
      return NextResponse.json({ success: true, message: "All leads are already assigned to this person." });
    }

    await prisma.notification.deleteMany({ where: { leadId: { in: toAssign.map((l) => l.id) } } });

    await prisma.lead.updateMany({
      where: { id: { in: toAssign.map((l) => l.id) } },
      data: { assignedToId: userId },
    });

    const msg = alreadyAssigned.length > 0
      ? `${toAssign.length} leads assigned, ${alreadyAssigned.length} skipped (already assigned).`
      : `${toAssign.length} leads assigned.`;

    const response = NextResponse.json({ success: true, message: msg });

    const tlName = auth.user.name || "Your team leader";
    after(() => notifyBulkAssigned({ userId, leadCount: toAssign.length, assignedByName: tlName, assignedById: auth.user.id }).catch((err) =>
      console.error("❌ Distribute notification failed:", err),
    ));

    return response;
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}