import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyLeadAssigned } from "@/lib/notify-lead-assigned";
import { requireAuth } from "@/lib/require-auth";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;
    const { salespersonId } = await req.json();

    if (!salespersonId) {
      // Unassign
      const lead = await prisma.lead.update({
        where: { id },
        data: { assignedToId: null },
        include: { assignedTo: { select: { id: true, name: true } } },
      });
      await prisma.notification.deleteMany({ where: { leadId: id } });
      return NextResponse.json({ success: true, message: "Lead unassigned successfully.", data: lead });
    }

    // Verify salesperson exists
    const sp = await prisma.user.findFirst({
      where: { id: salespersonId, role: { in: ["SALESPERSON", "TEAM_LEAD"] }, isActive: true },
    });
    if (!sp) {
      return NextResponse.json({ success: false, message: "Salesperson not found or inactive." }, { status: 400 });
    }

    const existingLead = await prisma.lead.findUnique({ where: { id }, select: { assignedToId: true } });
    if (existingLead?.assignedToId === salespersonId) {
      return NextResponse.json({ success: true, message: "Lead is already assigned to this person." });
    }

    // Assign
    const lead = await prisma.lead.update({
      where: { id },
      data: { assignedToId: salespersonId },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    await prisma.notification.deleteMany({ where: { leadId: id } });

    const response = NextResponse.json({ success: true, message: `Lead assigned to ${sp.name}.`, data: lead });

    after(() => notifyLeadAssigned({ userId: salespersonId, leadId: lead.id, leadName: lead.name }).catch((err) =>
      console.error("❌ Admin assign notification failed:", err),
    ));

    return response;
  } catch (error: any) {
    console.error("[ASSIGN FAIL]", error instanceof Error ? error.message : String(error));
    if (error?.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Lead not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to assign lead — server error" },
      { status: 500 }
    );
  }
}
