import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";
import { checkLeadCompletion } from "@/lib/lead-completion";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

    const { id } = await context.params;

    const lead = await prisma.lead.findFirst({
      where: {
        id,
        isDeleted: false,
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
  req: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

    const { id } = await context.params;

    const body = await req.json();

    const lead = await prisma.lead.findFirst({
      where: {
        id,
        isDeleted: false,
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

      // Track first response (SLA)
      if (!lead.firstResponseAt) {
        await prisma.lead.update({
          where: { id },
          data: { firstResponseAt: new Date() },
        });
      }

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

      data: {
        ...dataToUpdate,
        completion: checkLeadCompletion({
          name: body.name ?? lead.name,
          phone: lead.phone,
          email: body.email ?? lead.email,
          city: body.city ?? lead.city,
          age: body.age ? Number(body.age) : lead.age,
          purpose: body.purpose ?? lead.purpose,
          currentStatus: body.currentStatus ?? lead.currentStatus,
          bestTimeToReach: body.bestTimeToReach ?? lead.bestTimeToReach,
          willingToAttendTraining: body.willingToAttendTraining !== undefined
            ? body.willingToAttendTraining === "YES"
            : lead.willingToAttendTraining,
        }),
        ...(!lead.firstResponseAt && Object.keys(changes).length > 0 && { firstResponseAt: new Date() }),
      },
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
