import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
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

      // No one owns this lead anymore — any existing "lead assigned"
      // notification (for whoever had it before) is now stale, so remove it.
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

    // Reassigning: clear out any previous "lead assigned" notification for
    // this lead (e.g. the old salesperson's copy) before creating the new one,
    // so it doesn't stick around pointing at a lead they no longer own.
    await prisma.notification.deleteMany({
      where: {
        leadId: id,
      },
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        title: "🔔 New Lead Assigned",

        message: `${lead.name || "New lead"} has been assigned to you check it out!`,

        userId: salespersonId,

        leadId: id,

        link: `/sales/my-leads?leadId=${lead.id}`,
      },
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
