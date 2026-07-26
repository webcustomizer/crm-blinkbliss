import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";
import { getPKTFutureDate } from "@/lib/format-date";

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

const SETTINGS_CACHE_TTL_MS = 60_000;
let settingsCache: {
  value: Awaited<ReturnType<typeof prisma.cRMSetting.findFirst>>;
  fetchedAt: number;
} | null = null;

async function getCachedCRMSettings() {
  if (settingsCache && Date.now() - settingsCache.fetchedAt < SETTINGS_CACHE_TTL_MS) {
    return settingsCache.value;
  }
  const value = await prisma.cRMSetting.findFirst();
  settingsCache = { value, fetchedAt: Date.now() };
  return value;
}

function isFollowUpDuePKT(nextFollowUp: Date): boolean {
  const followUpPKT = new Date(nextFollowUp.getTime() + PKT_OFFSET_MS);
  const nowPKT = new Date(Date.now() + PKT_OFFSET_MS);
  return followUpPKT.toISOString().split("T")[0] <= nowPKT.toISOString().split("T")[0];
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;
  const user = auth.user;

  try {
    const { id } = await params;
    const { remarks, status } = await req.json();

    const teamMemberIds = (
      await prisma.user.findMany({ where: { teamLeaderId: user.id }, select: { id: true } })
    ).map((u) => u.id);
    const allIds = [user.id, ...teamMemberIds];

    const [lead, settings] = await Promise.all([
      prisma.lead.findFirst({
        where: { id, isDeleted: false, assignedToId: { in: allIds } },
        select: {
          id: true, status: true, followUpCount: true, nextFollowUp: true,
          name: true, phone: true, firstResponseAt: true, assignedToId: true,
        },
      }),
      getCachedCRMSettings(),
    ]);

    if (!lead) return NextResponse.json({ success: false, message: "Lead not found." }, { status: 404 });
    if (!settings) return NextResponse.json({ success: false, message: "Settings not found." }, { status: 400 });

    const maxFollowUps = settings.maxFollowUps ?? 4;
    if (lead.followUpCount >= maxFollowUps) {
      return NextResponse.json({ success: false, message: "Maximum follow ups completed." }, { status: 400 });
    }
    if (lead.nextFollowUp && !isFollowUpDuePKT(new Date(lead.nextFollowUp))) {
      return NextResponse.json({ success: false, message: "Follow up is not due yet." }, { status: 400 });
    }
    if (!remarks?.trim()) {
      return NextResponse.json({ success: false, message: "Remarks are required." }, { status: 400 });
    }
    if (!status) {
      return NextResponse.json({ success: false, message: "Status is required." }, { status: 400 });
    }

    let formattedNextFollowUp: Date | null = null;
    if (status !== "JOINED" && status !== "DEAD") {
      const currentCount = lead.followUpCount || 0;
      const newCount = currentCount + 1;
      let days = 0;
      if (currentCount === 0) days = settings.firstFollowUpDays ?? 7;
      else if (currentCount === 1) days = settings.secondFollowUpDays ?? 15;
      else if (currentCount === 2) days = settings.thirdFollowUpDays ?? 30;
      if (newCount < maxFollowUps) formattedNextFollowUp = getPKTFutureDate(days);
    }

    const finalStatus = status;
    const statusChanged = lead.status !== finalStatus;
    const actorId = lead.assignedToId || user.id;

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id },
        data: {
          remarks, status: finalStatus,
          followUpCount: status === "JOINED" || status === "DEAD" ? lead.followUpCount : { increment: 1 },
          lastFollowUp: new Date(), nextFollowUp: formattedNextFollowUp,
          isPriority: false,
          ...(!lead.firstResponseAt && { firstResponseAt: new Date() }),
        },
      });
      await tx.followUp.create({
        data: {
          leadId: id, userId: actorId, remarks,
          followUpNumber: lead.followUpCount + 1,
          nextFollowUp: formattedNextFollowUp,
        },
      });
      if (statusChanged) {
        await tx.statusHistory.create({
          data: { leadId: id, oldStatus: lead.status, newStatus: finalStatus, changedById: user.id },
        });
      }
    });

    if (statusChanged && finalStatus === "JOINED") {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const assignedUserId = lead.assignedToId || user.id;

      const joinedCount = await prisma.statusHistory.count({
        where: {
          newStatus: "JOINED",
          changedAt: { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0, 23, 59, 59, 999) },
          lead: { assignedToId: assignedUserId },
        },
      });

      const salesTarget = await prisma.salesTarget.findUnique({
        where: { userId_month_year: { userId: assignedUserId, month, year } },
      });

      if (salesTarget && joinedCount >= salesTarget.target && !salesTarget.achieved) {
        await prisma.salesTarget.update({ where: { id: salesTarget.id }, data: { achieved: 1 } });
      }

      const teamMemberIds = (await prisma.user.findMany({ where: { teamLeaderId: user.id }, select: { id: true } })).map((u) => u.id);
      const allTeamIds = [user.id, ...teamMemberIds];

      const teamJoinedCount = await prisma.statusHistory.count({
        where: {
          newStatus: "JOINED",
          changedAt: { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0, 23, 59, 59, 999) },
          lead: { assignedToId: { in: allTeamIds } },
        },
      });

      const team = await prisma.team.findFirst({ where: { leaderId: user.id } });

      if (team) {
        const teamTarget = await prisma.teamTarget.findUnique({
          where: { teamId_month_year: { teamId: team.id, month, year } },
        });

        if (teamTarget && teamJoinedCount >= teamTarget.target && !teamTarget.achieved) {
          await prisma.teamTarget.update({ where: { id: teamTarget.id }, data: { achieved: 1 } });
        }
      }

      const assignedUser = await prisma.user.findUnique({ where: { id: assignedUserId }, select: { monthlyTarget: true, targetMonths: true, eligibleForTeamLeader: true } });
      if (assignedUser && assignedUser.targetMonths > 0 && !assignedUser.eligibleForTeamLeader) {
        const evalSalesTarget = await prisma.salesTarget.findUnique({
          where: { userId_month_year: { userId: assignedUserId, month, year } },
        });
        const monthlyGoal = evalSalesTarget?.target ?? assignedUser.monthlyTarget;
        const totalGoal = monthlyGoal * assignedUser.targetMonths;
        const evaluationStart = new Date(year, month - assignedUser.targetMonths, 1);
        const evalCount = await prisma.statusHistory.count({
          where: {
            newStatus: "JOINED",
            changedAt: { gte: evaluationStart, lte: new Date(year, month, 0, 23, 59, 59, 999) },
            lead: { assignedToId: assignedUserId },
          },
        });
        if (evalCount >= totalGoal && totalGoal > 0) {
          await prisma.user.update({ where: { id: assignedUserId }, data: { eligibleForTeamLeader: true, eligibleSince: new Date() } });
        }
      }
    }

    if (statusChanged) {
      logActivity({
        userId: user.id, leadId: id, action: ActivityAction.STATUS_CHANGED,
        description: `${user.name} (TL) changed lead status`,
        metadata: { leadName: lead.name || lead.phone, oldStatus: lead.status, newStatus: finalStatus },
      }).catch(() => {});
    }
    logActivity({
      userId: user.id, leadId: id, action: ActivityAction.FOLLOWUP_COMPLETED,
      description: `${user.name} (TL) completed follow up`,
      metadata: { leadName: lead.name || lead.phone, followUpNumber: lead.followUpCount + 1, remarks },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "Follow up completed." });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}
