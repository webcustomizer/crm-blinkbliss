import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyLeadAssigned } from "@/lib/notify-lead-assigned";
import { requireAuth } from "@/lib/require-auth";

export async function PATCH(
  req: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;

    const body = await req.json();

    const { salespersonId } = body;

    // Remove assignment
    if (!salespersonId) {
      const lead = await prisma.lead.update({
        where: {
          id,
        },

        data: {
          assignedToId: null,
        },

        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Remove old notification
      await prisma.notification.deleteMany({
        where: {
          leadId: id,
        },
      });

      return NextResponse.json({
        success: true,
        data: lead,
      });
    }

    // Assign Lead
    const lead = await prisma.lead.update({
      where: {
        id,
      },

      data: {
        assignedToId: salespersonId,
      },

      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Send notification + push
    await notifyLeadAssigned({
      userId: salespersonId,
      leadId: lead.id,
      leadName: lead.name,
    });

    return NextResponse.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to assign lead",
      },
      {
        status: 500,
      },
    );
  }
}
