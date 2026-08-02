import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;

    const user = await prisma.user.findUnique({
      where: { id, role: { in: ["SALESPERSON", "TEAM_LEAD"] } },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        isActive: true, createdAt: true, responseTimeAvg: true,
        monthlyTarget: true, targetMonths: true,
        eligibleForTeamLeader: true, eligibleSince: true,
        twoFactorEnabled: true,
        teamLeaderId: true,
        teamLeader: { select: { id: true, name: true } },
        ledTeam: { select: { id: true, name: true } },
        _count: { select: { teamMembers: true, leads: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const whereBase = { assignedToId: id, isDeleted: false };

    const [statusCounts, totalLeads, followupCount, targetHistory] = await Promise.all([
      prisma.lead.groupBy({ by: ["status"], where: whereBase, _count: true }),
      prisma.lead.count({ where: whereBase }),
      prisma.followUp.count({ where: { userId: id, followUpNumber: { gt: 0 } } }),
      prisma.salesTarget.findMany({
        where: { userId: id },
        select: { id: true, month: true, year: true, target: true, createdAt: true },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 12,
      }),
    ]);

    const [overdueFollowups, upcomingFollowups, recentActivities, loginSessions] = await Promise.all([
      prisma.followUp.findMany({
        where: {
          userId: id,
          nextFollowUp: { lt: new Date() },
          lead: { status: { notIn: ["JOINED", "DEAD"] }, isDeleted: false },
        },
        select: {
          id: true, remarks: true, followUpNumber: true, nextFollowUp: true, createdAt: true,
          lead: { select: { id: true, name: true, phone: true, status: true } },
        },
        orderBy: { nextFollowUp: "asc" },
        take: 10,
      }),
      prisma.followUp.findMany({
        where: {
          userId: id,
          nextFollowUp: { gte: new Date() },
          lead: { status: { notIn: ["JOINED", "DEAD"] }, isDeleted: false },
        },
        select: {
          id: true, remarks: true, followUpNumber: true, nextFollowUp: true, createdAt: true,
          lead: { select: { id: true, name: true, phone: true, status: true } },
        },
        orderBy: { nextFollowUp: "asc" },
        take: 10,
      }),
      prisma.activityLog.findMany({
        where: { userId: id },
        select: {
          id: true, action: true, description: true, createdAt: true,
          lead: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      prisma.loginSession.findMany({
        where: { userId: id },
        select: {
          id: true, deviceName: true, deviceType: true, browser: true,
          os: true, ipAddress: true, isExpired: true, lastActiveAt: true, createdAt: true,
        },
        orderBy: { lastActiveAt: "desc" },
        take: 10,
      }),
    ]);

    const [sentCount, receivedCount, unreadCount] = await Promise.all([
      prisma.message.count({ where: { senderId: id } }),
      prisma.message.count({ where: { receiverId: id } }),
      prisma.message.count({ where: { receiverId: id, isRead: false } }),
    ]);

    const messageStats = { sent: sentCount, received: receivedCount, unread: unreadCount };

    const targetJoinedCounts: Array<{ id: string; joined: number }> = [];
    for (const t of targetHistory) {
      const start = new Date(t.year, t.month - 1, 1);
      const end = new Date(t.year, t.month, 1);
      const count = await prisma.lead.count({
        where: {
          assignedToId: id,
          status: "JOINED",
          isDeleted: false,
          createdAt: { gte: start, lt: end },
        },
      });
      targetJoinedCounts.push({ id: t.id, joined: count });
    }
    const joinedMap = new Map(targetJoinedCounts.map((r) => [r.id, r.joined]));
    const targetWithJoined = targetHistory.map((t) => ({
      ...t,
      joined: joinedMap.get(t.id) || 0,
    }));

    const statusMap: Record<string, number> = {};
    for (const s of statusCounts) statusMap[s.status] = s._count;

    const joinedCount = statusMap["JOINED"] || 0;
    const deadCount = statusMap["DEAD"] || 0;
    const activeLeads = totalLeads - joinedCount - deadCount;
    const conversionRate = totalLeads > 0 ? Math.round((joinedCount / totalLeads) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        user,
        stats: {
          totalLeads,
          activeLeads,
          joinedCount,
          deadCount,
          conversionRate,
          followupCount,
          responseTimeAvg: user.responseTimeAvg,
          statusCounts: statusMap,
        },
        followups: { overdue: overdueFollowups, upcoming: upcomingFollowups },
        recentActivities,
        loginSessions,
        messageStats,
        targetHistory: targetWithJoined,
      },
    });
  } catch (e: any) {
    console.error("Salesperson profile API error:", e?.message, e?.code, e?.meta);
    return NextResponse.json({ success: false, message: e?.message || "Failed.", code: e?.code }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;

    const body = await req.json();

    const updatedUser = await prisma.user.update({
      where: {
        id,
        role: { in: ["SALESPERSON", "TEAM_LEAD"] },
      },

      data: {
        ...(body.name && {
          name: body.name,
        }),

        ...(body.email && {
          email: body.email,
        }),

        ...(body.phone !== undefined && {
          phone: body.phone,
        }),

        ...(body.isActive !== undefined && {
          isActive: body.isActive,
        }),
      },

      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,

      message: "Salesperson updated successfully.",

      user: updatedUser,
    });
  } catch (error: any) {


    if (error.code === "P2002") {
      return NextResponse.json(
        {
          message: "Email already exists.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        message: "Something went wrong.",
      },
      {
        status: 500,
      },
    );
  }
}
