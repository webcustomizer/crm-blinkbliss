import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";

// Pakistan Standard Time = UTC+5 (no daylight saving)
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/**
 * Returns a Date representing "today + daysToAdd" in PKT, fixed at
 * 12:00 PM PKT (noon). Storing at noon (instead of midnight or "now")
 * guarantees the calendar date never shifts when the value is later
 * converted to/from UTC anywhere in the stack — regardless of the
 * server's system timezone (fixes local-vs-production UTC mismatch).
 */
function getPKTFutureDate(daysToAdd: number): Date {
  const pktNow = new Date(Date.now() + PKT_OFFSET_MS);

  const year = pktNow.getUTCFullYear();
  const month = pktNow.getUTCMonth();
  const day = pktNow.getUTCDate() + daysToAdd;

  const noonPKT = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));

  // Convert back to the real UTC instant to store in DB
  return new Date(noonPKT.getTime() - PKT_OFFSET_MS);
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
  req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const user = await verifyToken(token);

    if (user.role !== "SALESPERSON") {
      return NextResponse.json(
        {
          message: "Access denied",
        },
        {
          status: 403,
        },
      );
    }

    const { id } = await context.params;

    const body = await req.json();

    const { remarks, status } = body;

    const lead = await prisma.lead.findFirst({
      where: {
        id,
        assignedToId: user.id,
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

    const settings = await prisma.cRMSetting.findFirst();

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

      if (lead.status !== finalStatus) {
        await tx.statusHistory.create({
          data: {
            leadId: id,

            oldStatus: lead.status,

            newStatus: finalStatus,

            changedById: user.id,
          },
        });

        await logActivity({
          userId: user.id,
          leadId: id,
          action: ActivityAction.STATUS_CHANGED,
          description: `${user.name} changed lead status`,
          metadata: {
            leadName: lead.name || lead.phone,
            oldStatus: lead.status,
            newStatus: finalStatus,
          },
        });
      }

      await logActivity({
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
      });
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
