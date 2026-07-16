import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { ActivityAction } from "@/app/generated/prisma/client";
import { logActivity } from "@/lib/activity";

export async function POST() {
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

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          message: "Access denied",
        },
        {
          status: 403,
        },
      );
    }

    const settings = await prisma.cRMSetting.findFirst();

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

        await logActivity({
          userId: user.id,

          leadId: lead.id,

          action: ActivityAction.STATUS_CHANGED,

          description: `${user.name} moved expired lead to DEAD`,

          metadata: {
            reason: "Follow up expired",
            leadName: lead.name || lead.phone,
          },
        });
      }
    });

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
