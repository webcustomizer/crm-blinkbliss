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

    const teamMemberIds = (
      await prisma.user.findMany({ where: { teamLeaderId: user.id }, select: { id: true } })
    ).map((u) => u.id);
    const allIds = [user.id, ...teamMemberIds];

    const lead = await prisma.lead.findFirst({
      where: { id, isDeleted: false, assignedToId: { in: allIds } },
      select: { id: true, isPriority: true },
    });

    if (!lead) return NextResponse.json({ success: false, message: "Lead not found." }, { status: 404 });

    await prisma.lead.update({ where: { id }, data: { isPriority: !lead.isPriority } });

    return NextResponse.json({ success: true, isPriority: !lead.isPriority, message: !lead.isPriority ? "Marked priority." : "Priority removed." });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}
