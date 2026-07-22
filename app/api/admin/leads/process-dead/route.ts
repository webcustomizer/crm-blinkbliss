import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { requireAuth } from "@/lib/require-auth";
import { ActivityAction } from "@/app/generated/prisma/client";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

    const settings = await getCachedCRMSettings();

    if (!settings) {
      return NextResponse.json(
        {
          message: "CRM settings not found",
        },
        {
          status: 400,
        },
      );
    }

    const expireDate = new Date();

    expireDate.setDate(expireDate.getDate() - settings.deadAfterDays);

    const leads = await prisma.lead.findMany({
      where: {
        isDeleted: false,
        status: {
          notIn: ["DEAD", "JOINED"],
        },

        followUpCount: {
          gte: settings.maxFollowUps,
        },

        lastFollowUp: {
          not: null,
          lte: expireDate,
        },
      },

      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        followUpCount: true,
        lastFollowUp: true,
      },
    });

    if (leads.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expired leads found",
        count: 0,
      });
    }

    await prisma.$transaction(async (tx) => {
      for (const lead of leads) {
        await tx.lead.update({
          where: {
            id: lead.id,
          },

          data: {
            status: "DEAD",
          },
        });

        await tx.statusHistory.create({
          data: {
            leadId: lead.id,

            oldStatus: lead.status,

            newStatus: "DEAD",

            changedById: user.id,
          },
        });
      }
    });

    // Activity logging happens AFTER the transaction commits — using a
    // separate DB connection inside the transaction risks pool exhaustion
    // and creates phantom audit entries on rollback.
    for (const lead of leads) {
      logActivity({
        userId: user.id,

        leadId: lead.id,

        action: ActivityAction.STATUS_CHANGED,

        description: `${user.name} moved expired lead to DEAD`,

        metadata: {
          reason: "Follow up expired",
          leadName: lead.name || lead.phone,
        },
      }).catch((error) => {
        console.error("Activity log error (process-dead):", error);
      });
    }

    return NextResponse.json({
      success: true,

      message: `${leads.length} leads moved to DEAD`,

      count: leads.length,
    });
  } catch (error) {
    console.error("PROCESS DEAD LEADS ERROR:", error);

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
