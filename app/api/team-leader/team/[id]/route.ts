import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const member = await prisma.user.findFirst({
      where: { id, teamLeaderId: auth.user.id },
      select: {
        id: true, name: true, email: true, phone: true, isActive: true,
        monthlyTarget: true, createdAt: true,
        _count: { select: { leads: { where: { isDeleted: false } } } },
      },
    });
    if (!member) return NextResponse.json({ success: false, message: "Member not found." }, { status: 404 });

    const [statusCounts, recentLeads, totalFollowups, lastFollowUp] = await Promise.all([
      prisma.lead.groupBy({
        by: ["status"],
        where: { assignedToId: id, isDeleted: false },
        _count: true,
      }),
      prisma.lead.findMany({
        where: { assignedToId: id, isDeleted: false },
        select: {
          id: true, name: true, phone: true, status: true,
          followUpCount: true, createdAt: true, isPriority: true,
          lastFollowUp: true, nextFollowUp: true,
        },
        orderBy: [{ isPriority: "desc" }, { updatedAt: "desc" }],
        take: 10,
      }),
      prisma.followUp.count({ where: { userId: id, followUpNumber: { gt: 0 } } }),
      prisma.followUp.findFirst({
        where: { userId: id, followUpNumber: { gt: 0 } },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const sc of statusCounts) statusMap[sc.status] = sc._count;

    const joinedCount = statusMap["JOINED"] || 0;
    const deadCount = statusMap["DEAD"] || 0;
    const newCount = statusMap["NEW"] || 0;

    return NextResponse.json({
      success: true,
      data: {
        ...member,
        statusCounts: statusMap,
        recentLeads,
        totalFollowups,
        lastFollowUpAt: lastFollowUp?.createdAt || null,
        joinedCount,
        deadCount,
        newCount,
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}