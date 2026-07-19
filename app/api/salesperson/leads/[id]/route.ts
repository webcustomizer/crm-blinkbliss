import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
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

    const lead = await prisma.lead.findFirst({
      where: {
        id,

        assignedToId: user.id,
      },

      include: {
        followups: {
          orderBy: {
            createdAt: "desc",
          },
          take: 50,

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
          take: 50,

          include: {
            changedBy: {
              select: {
                id: true,

                name: true,
              },
            },
          },
        },

        assignedTo: {
          select: {
            id: true,

            name: true,
          },
        },
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

    return NextResponse.json({
      lead,
    });
  } catch (error) {
    console.error("Lead Detail Error:", error);

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

    const body = await req.json();

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

    // =====================================================
    // NOTE-ONLY SAVE ("Save Note" button)
    // - Permanently saved as a FollowUp record with
    //   followUpNumber = 0 → shows in history forever
    // - Does NOT touch followUpCount / nextFollowUp / status
    //   so it never counts as a real follow up
    // =====================================================
    if (body.isNote) {
      const remarksText = (body.remarks || "").trim();

      if (!remarksText) {
        return NextResponse.json(
          {
            message: "Please write something before saving",
          },
          {
            status: 400,
          },
        );
      }

      if (lead.status === "JOINED" || lead.status === "DEAD") {
        return NextResponse.json(
          {
            message: "Lead is closed",
          },
          {
            status: 400,
          },
        );
      }

      const note = await prisma.followUp.create({
        data: {
          leadId: id,
          userId: user.id,
          remarks: remarksText,
          followUpNumber: 0, // 0 = plain note, never counted
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      await logActivity({
        userId: user.id,
        leadId: id,
        action: ActivityAction.REMARK_UPDATED,
        description: `${user.name} added a note`,
        metadata: {
          leadName: lead.name || lead.phone,
          remarks: remarksText,
        },
      });

      return NextResponse.json({
        message: "Note saved successfully",
        note,
      });
    }

    const dataToUpdate: Record<string, unknown> = {};
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    function addChange(field: string, oldValue: unknown, newValue: unknown) {
      if (newValue !== undefined && newValue !== "" && oldValue !== newValue) {
        changes[field] = {
          old: oldValue || null,
          new: newValue,
        };
      }
    }

    // Name
    if (!lead.name && body.name) {
      dataToUpdate.name = body.name;
      addChange("name", lead.name, body.name);
    }

    // Email
    if (!lead.email && body.email) {
      dataToUpdate.email = body.email;
      addChange("email", lead.email, body.email);
    }

    // City
    if (!lead.city && body.city) {
      dataToUpdate.city = body.city;
      addChange("city", lead.city, body.city);
    }

    // Age
    if (!lead.age && body.age) {
      dataToUpdate.age = Number(body.age);
      addChange("age", lead.age, Number(body.age));
    }

    // Purpose
    if (!lead.purpose && body.purpose) {
      dataToUpdate.purpose = body.purpose;
      addChange("purpose", lead.purpose, body.purpose);
    }

    // Current Status
    if (!lead.currentStatus && body.currentStatus) {
      dataToUpdate.currentStatus = body.currentStatus;
      addChange("currentStatus", lead.currentStatus, body.currentStatus);
    }

    // Best Time
    if (!lead.bestTimeToReach && body.bestTimeToReach) {
      dataToUpdate.bestTimeToReach = body.bestTimeToReach;
      addChange("bestTimeToReach", lead.bestTimeToReach, body.bestTimeToReach);
    }

    // Training
    if (
      lead.willingToAttendTraining === null &&
      body.willingToAttendTraining !== undefined
    ) {
      const training = body.willingToAttendTraining === "YES";

      dataToUpdate.willingToAttendTraining = training;

      addChange(
        "willingToAttendTraining",
        lead.willingToAttendTraining,
        training,
      );
    }

    const updatedLead = await prisma.lead.update({
      where: {
        id,
      },

      data: dataToUpdate,
    });

    // Create Activity Log only when something changed
    if (Object.keys(changes).length > 0) {
      await logActivity({
        userId: user.id,
        leadId: id,
        action: ActivityAction.LEAD_UPDATED,
        description: `${user.name} updated lead information`,
        metadata: {
          leadName: lead.name || lead.phone,
          changes,
        },
      });
    }

    return NextResponse.json({
      message: "Lead updated successfully",
      lead: updatedLead,
    });
  } catch (error) {
    console.error("Update Lead Error:", error);

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
