import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";
import { updateResponseTimeAverage } from "@/lib/update-response-time";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["NEW", "CALLED", "TRAINING_ATTENDED", "SEAT_RESERVED", "NEED_MORE_FOLLOW_UP", "JOINED", "DEAD"];

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

    const { status, remarks } = await req.json();

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

    if (!remarks?.trim()) {
      return NextResponse.json(
        { message: "Remarks are required before changing status." },
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
          isPriority: false,
          ...(!lead.firstResponseAt && { firstResponseAt: new Date() }),
        },
      });

      await tx.followUp.create({
        data: {
          leadId: id,
          userId: user.id,
          remarks: remarks.trim(),
          followUpNumber: 0,
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
