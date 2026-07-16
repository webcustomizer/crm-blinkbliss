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
      // Only what's read below — status/name/phone for the diff and
      // activity-log metadata — instead of pulling the whole row.
      select: {
        id: true,
        status: true,
        name: true,
        phone: true,
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

    const statusChanged = lead.status !== status;

    // Only the lead update + status-history row need to be atomic with
    // each other. The activity log is audit trail, not core state — it
    // doesn't need to share a transaction with the state change, and it
    // doesn't need to finish before the client gets a response.
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: {
          id,
        },

        data: {
          status,
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

    // Fire-and-forget — runs after the transaction commits without the
    // client waiting on it. Errors are logged rather than turning a
    // successful status update into a 500.
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
