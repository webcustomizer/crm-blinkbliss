import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// GET LEAD DETAILS
export async function GET(
  req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } = await context.params;

    const lead = await prisma.lead.findUnique({
      where: {
        id,
      },

      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },

        followups: {
          orderBy: {
            createdAt: "desc",
          },

          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },

        statusHistory: {
          orderBy: {
            changedAt: "desc",
          },

          include: {
            changedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead not found",
        },
        {
          status: 404,
        },
      );
    }
    // ==========================
    // AUTO DEAD CHECK
    // ==========================

    const setting = await prisma.cRMSetting.findFirst();

    if (
      setting &&
      lead.followUpCount >= (setting.maxFollowUps ?? 3) &&
      lead.nextFollowUp &&
      new Date() >= new Date(lead.nextFollowUp) &&
      lead.status !== "JOINED" &&
      lead.status !== "DEAD"
    ) {
      await prisma.lead.update({
        where: {
          id: lead.id,
        },

        data: {
          status: "DEAD",
          nextFollowUp: null,
        },
      });

      lead.status = "DEAD";
      lead.nextFollowUp = null;
    }
    return NextResponse.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.log("GET LEAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to get lead",
      },
      {
        status: 500,
      },
    );
  }
}

// UPDATE LEAD
export async function PATCH(
  req: Request,

  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const { id } = await context.params;

    const token = req.headers.get("cookie")?.split("token=")[1]?.split(";")[0];

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const currentUser = (await verifyToken(token)) as {
      id: string;
      name: string;
      role: string;
    };

    const body = await req.json();

    const oldLead = await prisma.lead.findUnique({
      where: {
        id,
      },
    });

    if (!oldLead) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead not found",
        },
        {
          status: 404,
        },
      );
    }

    // ==========================
    // DEAD -> NEW RESET
    // ==========================
    // Jab koi DEAD lead dobara NEW status mein le jayi jaye, usay
    // bilkul fresh lead ki tarah reset karte hain: follow-up count,
    // dates, remarks, aur poori follow-up/status history clear ho jati hai.
    const isDeadToNewReset = oldLead.status === "DEAD" && body.status === "NEW";

    let resetUpdate: any = {};

    if (isDeadToNewReset) {
      await prisma.followUp.deleteMany({
        where: {
          leadId: id,
        },
      });

      await prisma.statusHistory.deleteMany({
        where: {
          leadId: id,
        },
      });

      resetUpdate = {
        followUpCount: 0,
        lastFollowUp: null,
        nextFollowUp: null,
        remarks: null,
      };
    }

    let followUpUpdate: any = {};

    // ==========================
    // FOLLOW UP AUTOMATION
    // ==========================

    if (body.followUpDone === true) {
      const setting = await prisma.cRMSetting.findFirst();

      const currentCount = oldLead.followUpCount || 0;

      const newCount = currentCount + 1;

      const maxFollowUps = setting?.maxFollowUps ?? 3;

      const nextStatus = oldLead.status;

      let days = 0;

      // ==========================
      // FOLLOW UP DAYS FROM SETTINGS
      // ==========================

      if (currentCount === 0) {
        days = setting?.firstFollowUpDays ?? 7;
      } else if (currentCount === 1) {
        days = setting?.secondFollowUpDays ?? 15;
      } else if (currentCount === 2) {
        days = setting?.thirdFollowUpDays ?? 30;
      } else {
        days = setting?.thirdFollowUpDays ?? 30;
      }

      let nextFollowUp: Date | null = null;

      if (newCount < maxFollowUps) {
        nextFollowUp = new Date();

        nextFollowUp.setDate(nextFollowUp.getDate() + days);
      } else {
        // Max follow ups completed
        // Dead timer start from last follow up date

        nextFollowUp = null;
      }

      await prisma.followUp.create({
        data: {
          remarks: body.remarks || "Follow up completed",

          followUpNumber: newCount,

          nextFollowUp,

          leadId: id,

          userId: currentUser.id,
        },
      });

      followUpUpdate = {
        followUpCount: newCount,

        lastFollowUp: new Date(),

        status: nextStatus,

        nextFollowUp,
      };
    }
    const updatedLead = await prisma.lead.update({
      where: {
        id,
      },

      data: {
        ...(body.name !== undefined && {
          name: body.name,
        }),

        ...(body.phone !== undefined && {
          phone: body.phone,
        }),

        ...(body.email !== undefined && {
          email: body.email,
        }),

        ...(body.city !== undefined && {
          city: body.city,
        }),

        ...(body.age !== undefined && {
          age: body.age,
        }),

        ...(body.purpose !== undefined && {
          purpose: body.purpose,
        }),

        ...(body.currentStatus !== undefined && {
          currentStatus: body.currentStatus,
        }),

        ...(body.bestTimeToReach !== undefined && {
          bestTimeToReach: body.bestTimeToReach,
        }),

        ...(body.willingToAttendTraining !== undefined && {
          willingToAttendTraining: body.willingToAttendTraining,
        }),

        ...(body.status !== undefined && {
          status: body.status,
        }),

        ...(body.remarks !== undefined && {
          remarks: body.remarks,
        }),

        ...(body.assignedToId !== undefined && {
          assignedToId: body.assignedToId || null,
        }),

        ...(body.nextFollowUp !== undefined && {
          nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp) : null,
        }),

        ...followUpUpdate,

        ...resetUpdate,
      },
    });

    // STATUS HISTORY SAVE
    // Reset case ke liye history save nahi karte, kyunke lead ab
    // bilkul fresh hai — koi status history nahi honi chahiye.

    const finalStatus = followUpUpdate.status || body.status;

    if (!isDeadToNewReset && finalStatus && oldLead.status !== finalStatus) {
      await prisma.statusHistory.create({
        data: {
          leadId: id,

          oldStatus: oldLead.status,

          newStatus: finalStatus,

          changedById: currentUser.id,
        },
      });
    }
    return NextResponse.json({
      success: true,

      message: "Lead updated successfully",

      data: updatedLead,
    });
  } catch (error) {
    console.log("PATCH LEAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update lead",
      },

      {
        status: 500,
      },
    );
  }
}
