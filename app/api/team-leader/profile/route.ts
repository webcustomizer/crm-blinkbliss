import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const teamMemberIds = (
      await prisma.user.findMany({ where: { teamLeaderId: auth.user.id }, select: { id: true } })
    ).map((u) => u.id);
    const allIds = [auth.user.id, ...teamMemberIds];

    const [user, teamMembersCount, leadsCount, statusHistoriesCount] = await prisma.$transaction([
      prisma.user.findUnique({
        where: { id: auth.user.id },
        select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
      }),
      prisma.user.count({ where: { teamLeaderId: auth.user.id } }),
      prisma.lead.count({ where: { assignedToId: { in: allIds }, isDeleted: false } }),
      prisma.statusHistory.count({ where: { lead: { assignedToId: { in: allIds }, isDeleted: false } } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        _count: {
          teamMembers: teamMembersCount,
          leads: leadsCount,
          statusHistories: statusHistoriesCount,
        },
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const { name, phone } = await req.json();
    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: { name, phone },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });
    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}