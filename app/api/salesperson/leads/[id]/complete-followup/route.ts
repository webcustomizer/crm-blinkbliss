import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";
import { updateResponseTimeAverage } from "@/lib/update-response-time";
import { getPKTFutureDate } from "@/lib/format-date";

// Pakistan Standard Time = UTC+5 (no daylight saving)
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

// CRM settings (maxFollowUps, follow-up day intervals, etc.) change
// rarely — caching them in-memory for a short window avoids a DB
// round trip on every single follow-up completion. Falls back to a
// fresh fetch automatically once the TTL expires or on cold start.
const SETTINGS_CACHE_TTL_MS = 60_000;
let settingsCache: {
  value: Awaited<ReturnType<typeof prisma.cRMSetting.findFirst>>;
  fetchedAt: number;
} | null = null;

async function getCachedCRMSettings() {
  if (
    settingsCache &&
    Date.now() - settingsCache.fetchedAt < SETTINGS_CACHE_TTL_MS
  ) {
    return settingsCache.value;
  }

  const value = await prisma.cRMSetting.findFirst();
  settingsCache = { value, fetchedAt: Date.now() };
  return value;
}

/**
 * Mirrors the frontend's `nextFollowUpReached` logic: a follow-up is
 * "due" for the entire PKT calendar day it's scheduled on, not only
 * after the exact stored time (noon PKT) has passed. Comparing raw
 * instants instead of calendar dates is what caused "Follow up is not
 * due yet" to fire on the due date before noon PKT even though the
 * UI already showed the button as enabled.
 */
function isFollowUpDuePKT(nextFollowUp: Date): boolean {
  const followUpPKT = new Date(nextFollowUp.getTime() + PKT_OFFSET_MS);
  const nowPKT = new Date(Date.now() + PKT_OFFSET_MS);

  const followUpDateStr = followUpPKT.toISOString().split("T")[0];
  const nowDateStr = nowPKT.toISOString().split("T")[0];

  return followUpDateStr <= nowDateStr;
}

export async function POST(
  req: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

    const { id } = await context.params;

    const body = await req.json();

    const { remarks, status } = body;

    // These two lookups don't depend on each other — running them
    // concurrently overlaps their latency instead of stacking it.
    // (Settings are also cached — see getCachedCRMSettings — so most
    // requests skip the DB for that half entirely.)
    const [lead, settings] = await Promise.all([
      prisma.lead.findFirst({
        where: {
          id,
          isDeleted: false,
          assignedToId: user.id,
        },
        // Only what's actually read below — smaller round trip than
        // pulling every column on the model.
        select: {
          id: true,
          status: true,
          followUpCount: true,
          nextFollowUp: true,
          name: true,
          phone: true,
          firstResponseAt: true,
        },
      }),
      getCachedCRMSettings(),
    ]);

    if (!lead) {
      return NextResponse.json(
        {
          message: "Lead not found",
        },
        {
          status: 404,
        },
      );
    }

    if (!settings) {
      return NextResponse.json(
        {
          message: "CRM settings not found.",
        },
        {
          status: 400,
        },
      );
    }

    const maxFollowUps = settings.maxFollowUps ?? 4;

    // =========================
    // MAX FOLLOW UP LIMIT
    // =========================

    if (lead.followUpCount >= maxFollowUps) {
      return NextResponse.json(
        {
          message: "Maximum follow ups completed.",
        },
        {
          status: 400,
        },
      );
    }

    // =========================
    // FOLLOW UP DATE LOCK
    // =========================

    if (lead.nextFollowUp && !isFollowUpDuePKT(new Date(lead.nextFollowUp))) {
      return NextResponse.json(
        {
          message: "Follow up is not due yet.",
        },
        {
          status: 400,
        },
      );
    }

    if (!remarks?.trim()) {
      return NextResponse.json(
        {
          message: "Remarks are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!status) {
      return NextResponse.json(
        {
          message: "Status is required.",
        },
        {
          status: 400,
        },
      );
    }

    let formattedNextFollowUp: Date | null = null;

    // =========================
    // NEXT FOLLOW UP DATE
    // =========================

    if (status !== "JOINED" && status !== "DEAD") {
      const currentCount = lead.followUpCount || 0;

      const newCount = currentCount + 1;

      let days = 0;

      if (currentCount === 0) {
        // 1st follow up completed
        days = settings.firstFollowUpDays ?? 7;
      } else if (currentCount === 1) {
        // 2nd follow up completed
        days = settings.secondFollowUpDays ?? 15;
      } else if (currentCount === 2) {
        // 3rd follow up completed
        days = settings.thirdFollowUpDays ?? 30;
      } else {
        // final follow up completed
        days = 0;
      }

      // Do not create next follow up after max follow ups
      if (newCount < maxFollowUps) {
        formattedNextFollowUp = getPKTFutureDate(days);
      } else {
        formattedNextFollowUp = null;
      }
    }
    const finalStatus = status;
    const statusChanged = lead.status !== finalStatus;

    // Only the writes that must be atomic with each other stay in the
    // transaction: the lead's own state, the follow-up record, and the
    // status-history row (if the status changed). Activity-log entries
    // are audit trail, not core state — they don't need to block the
    // response or share a DB transaction with the state change.
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: {
          id,
        },

        data: {
          remarks,

          status: finalStatus,

          followUpCount:
            status === "JOINED" || status === "DEAD"
              ? lead.followUpCount
              : {
                  increment: 1,
                },

          lastFollowUp: new Date(),

          nextFollowUp: formattedNextFollowUp,

          isPriority: false,

          ...(!lead.firstResponseAt && { firstResponseAt: new Date() }),
        },
      });

      await tx.followUp.create({
        data: {
          leadId: id,

          userId: user.id,

          remarks,

          followUpNumber: lead.followUpCount + 1,

          nextFollowUp: formattedNextFollowUp,
        },
      });

      if (statusChanged) {
        await tx.statusHistory.create({
          data: {
            leadId: id,

            oldStatus: lead.status,

            newStatus: finalStatus,

            changedById: user.id,
          },
        });
      }
    });

    if (statusChanged && finalStatus === "JOINED") {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const joinedCount = await prisma.statusHistory.count({
        where: {
          newStatus: "JOINED",
          changedAt: { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0, 23, 59, 59, 999) },
          lead: { assignedToId: user.id },
        },
      });

      const salesTarget = await prisma.salesTarget.findUnique({
        where: { userId_month_year: { userId: user.id, month, year } },
      });

      if (salesTarget && joinedCount >= salesTarget.target && !salesTarget.achieved) {
        await prisma.salesTarget.update({
          where: { id: salesTarget.id },
          data: { achieved: 1 },
        });
      }

      if (!salesTarget && joinedCount > 0) {
        const user_ = await prisma.user.findUnique({ where: { id: user.id }, select: { monthlyTarget: true } });
        if (user_ && joinedCount >= user_.monthlyTarget) {
          await prisma.salesTarget.upsert({
            where: { userId_month_year: { userId: user.id, month, year } },
            create: { userId: user.id, month, year, target: user_.monthlyTarget, achieved: 1 },
            update: { achieved: 1 },
          });
        }
      }

      const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: { teamLeaderId: true } });

      if (fullUser?.teamLeaderId) {
        const myTeam = await prisma.team.findFirst({ where: { leaderId: fullUser.teamLeaderId } });
        if (myTeam) {
          const allTeamMemberIds = (
            await prisma.user.findMany({ where: { teamLeaderId: fullUser.teamLeaderId }, select: { id: true } })
          ).map((u) => u.id);

          const teamJoinedCount = await prisma.statusHistory.count({
            where: {
              newStatus: "JOINED",
              changedAt: { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0, 23, 59, 59, 999) },
              lead: { assignedToId: { in: allTeamMemberIds } },
            },
          });

          const teamTarget = await prisma.teamTarget.findUnique({
            where: { teamId_month_year: { teamId: myTeam.id, month, year } },
          });

          if (teamTarget && teamJoinedCount >= teamTarget.target && !teamTarget.achieved) {
            await prisma.teamTarget.update({ where: { id: teamTarget.id }, data: { achieved: 1 } });
          }
        }
      }

      const userData = await prisma.user.findUnique({ where: { id: user.id }, select: { monthlyTarget: true, targetMonths: true, eligibleForTeamLeader: true } });
      if (userData && userData.targetMonths > 0 && !userData.eligibleForTeamLeader) {
        const evaluationStart = new Date(year, month - userData.targetMonths, 1);
        const evalCount = await prisma.statusHistory.count({
          where: {
            newStatus: "JOINED",
            changedAt: { gte: evaluationStart, lte: new Date(year, month, 0, 23, 59, 59, 999) },
            lead: { assignedToId: user.id },
          },
        });
        const evalSalesTarget = await prisma.salesTarget.findUnique({
          where: { userId_month_year: { userId: user.id, month, year } },
        });
        const totalGoal = (evalSalesTarget?.target ?? userData.monthlyTarget) * userData.targetMonths;
        if (evalCount >= totalGoal && totalGoal > 0) {
          await prisma.user.update({ where: { id: user.id }, data: { eligibleForTeamLeader: true, eligibleSince: new Date() } });
        }
      }
    }

    // Fire-and-forget: these are audit logs, not core state, so they
    // run after the transaction commits without the client waiting on
    // them. Errors are swallowed here (and should be surfaced via
    // whatever logging/monitoring logActivity itself already reports
    // to) rather than turning a successful follow-up into a 500.
    if (!lead.firstResponseAt) {
      updateResponseTimeAverage(user.id).catch(() => {});
    }
    if (statusChanged) {
      logActivity({
        userId: user.id,
        leadId: id,
        action: ActivityAction.STATUS_CHANGED,
        description: `${user.name} changed lead status`,
        metadata: {
          leadName: lead.name || lead.phone,
          oldStatus: lead.status,
          newStatus: finalStatus,
        },
      }).catch((error) => {
        console.error("Activity log error (status changed):", error);
      });
    }

    logActivity({
      userId: user.id,
      leadId: id,
      action: ActivityAction.FOLLOWUP_COMPLETED,
      description: `${user.name} completed follow up`,
      metadata: {
        leadName: lead.name || lead.phone,
        followUpNumber: lead.followUpCount + 1,
        remarks,
        nextFollowUp: formattedNextFollowUp,
      },
    }).catch((error) => {
      console.error("Activity log error (followup completed):", error);
    });

    return NextResponse.json({
      message: "Follow up completed successfully.",
    });
  } catch (error) {
    console.error("Complete Follow Up Error:", error);

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
