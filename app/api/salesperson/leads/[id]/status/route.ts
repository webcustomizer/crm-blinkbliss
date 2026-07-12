import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";

export async function PATCH(
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

    const { status } = await req.json();

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

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: {
          id,
        },

        data: {
          status,
        },
      });

      if (lead.status !== status) {
        await tx.statusHistory.create({
          data: {
            leadId: id,

            oldStatus: lead.status,

            newStatus: status,

            changedById: user.id,
          },
        });
      }

      if (lead.status !== status) {
        await logActivity({
          userId: user.id,
          leadId: id,
          action: ActivityAction.STATUS_CHANGED,
          description: `${user.name} changed lead status`,
          metadata: {
            leadName: lead.name || lead.phone,
            oldStatus: lead.status,
            newStatus: status,
          },
        });
      }
    });

    return NextResponse.json({
      message: "Status updated",
    });
  } catch (error) {
    console.log(error);

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
