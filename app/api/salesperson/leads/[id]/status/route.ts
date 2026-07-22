import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";
import { updateResponseTimeAverage } from "@/lib/update-response-time";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["NEW", "CALLED", "TRAINING_ATTENDED", "SEAT_RESERVED", "NEED_MORE_FOLLOW_UP", "JOINED", "DEAD"];

// Pakistan Standard Time = UTC+5 (no daylight saving)
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

function isFollowUpDuePKT(nextFollowUp: Date): boolean {
  const followUpPKT = new Date(nextFollowUp.getTime() + PKT_OFFSET_MS);
  const nowPKT = new Date(Date.now() + PKT_OFFSET_MS);
  const followUpDateStr = followUpPKT.toISOString().split("T")[0];
  const nowDateStr = nowPKT.toISOString().split("T")[0];
  return followUpDateStr <= nowDateStr;
}

export async function PATCH(
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

    const { status } = await req.json();

    const lead = await prisma.lead.findFirst({
      where: {
        id,
        isDeleted: false,
        assignedToId: user.id,
      },
      select: {
        id: true,
        status: true,
        name: true,
        phone: true,
        firstResponseAt: true,
        followUpCount: true,
        nextFollowUp: true,
      },
    });

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

    if (!status) {
      return NextResponse.json(
        {
          message: "Status required",
        },
        {
          status: 400,
        },
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { message: "Invalid status value" },
        { status: 400 },
      );
    }

    // Enforce follow-up due-date lock: don't allow status changes before
    // the scheduled follow-up date, same as complete-followup route.
    // DEAD is always allowed (admin/system can mark dead anytime).
    if (status !== "DEAD" && lead.nextFollowUp && !isFollowUpDuePKT(new Date(lead.nextFollowUp))) {
      return NextResponse.json(
        { message: "Follow up is not due yet. Please wait for the scheduled date." },
        { status: 400 },
      );
    }

    const statusChanged = lead.status !== status;

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: {
          id,
        },

        data: {
          status,
          ...(!lead.firstResponseAt && { firstResponseAt: new Date() }),
        },
      });

      if (statusChanged) {
        await tx.statusHistory.create({
          data: {
            leadId: id,

            oldStatus: lead.status,

            newStatus: status,

            changedById: user.id,
          },
        });
      }
    });

    if (statusChanged) {
      logActivity({
        userId: user.id,
        leadId: id,
        action: ActivityAction.STATUS_CHANGED,
        description: `${user.name} changed lead status`,
        metadata: {
          leadName: lead.name || lead.phone,
          oldStatus: lead.status,
          newStatus: status,
        },
      }).catch((error) => {
        console.error("Activity log error (status changed):", error);
      });
    }

    if (!lead.firstResponseAt) {
      updateResponseTimeAverage(user.id).catch(() => {});
    }

    return NextResponse.json({
      message: "Status updated",
    });
  } catch (error) {


    return NextResponse.json(
      {
        message: "Something went wrong",
      },
      {
        status: 500,
      },
    );
  }
}
