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

    // Create Notification
    await prisma.notification.create({
      data: {
        title: "🔔 New Lead Assigned",

        message: `${lead.name || "New lead"} has been assigned to you check it out!`,

        userId: salespersonId,
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
