import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { requireAuth } from "@/lib/require-auth";
import { checkLeadCompletion } from "@/lib/lead-completion";
import { getPKTFutureDate } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(req, ["ADMIN"]);
    if ("error" in auth) return auth.error;
    const { id } = await context.params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        followups: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true } } },
        },
        statusHistory: {
          orderBy: { changedAt: "desc" },
          include: { changedBy: { select: { id: true, name: true } } },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, message: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to get lead" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(req, ["ADMIN"]);
    if ("error" in auth) return auth.error;
    const currentUser = auth.user;
    const { id } = await context.params;
    const body = await req.json();
    const oldLead = await prisma.lead.findUnique({ where: { id } });

    if (!oldLead) {
      return NextResponse.json({ success: false, message: "Lead not found" }, { status: 404 });
    }

    // DEAD -> NEW reset
    const isDeadToNewReset = oldLead.status === "DEAD" && body.status === "NEW";
    let resetUpdate: any = {};
    if (isDeadToNewReset) {
      await prisma.followUp.deleteMany({ where: { leadId: id } });
      await prisma.statusHistory.deleteMany({ where: { leadId: id } });
      resetUpdate = { followUpCount: 0, lastFollowUp: null, nextFollowUp: null, remarks: null };
    }

    let followUpUpdate: any = {};
    if (body.followUpDone === true) {
      const setting = await getCachedCRMSettings();
      const currentCount = oldLead.followUpCount || 0;
      const newCount = currentCount + 1;
      const maxFollowUps = setting?.maxFollowUps ?? 3;
      const nextStatus = oldLead.status;
      let days = 0;

      if (currentCount === 0) days = setting?.firstFollowUpDays ?? 7;
      else if (currentCount === 1) days = setting?.secondFollowUpDays ?? 15;
      else if (currentCount === 2) days = setting?.thirdFollowUpDays ?? 30;
      else days = setting?.thirdFollowUpDays ?? 30;

      let nextFollowUp: Date | null = null;
      if (newCount < maxFollowUps) {
        nextFollowUp = getPKTFutureDate(days);
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
        isPriority: false,
      };
    }

    // Track first response time (SLA)
    let slaUpdate: any = {};
    if ((body.status && body.status !== "NEW") || body.followUpDone || body.remarks) {
      if (!oldLead.firstResponseAt) {
        slaUpdate.firstResponseAt = new Date();
      }
    }

    const completion = checkLeadCompletion({
      name: body.name ?? oldLead.name,
      phone: body.phone ?? oldLead.phone,
      email: body.email ?? oldLead.email,
      city: body.city ?? oldLead.city,
      age: body.age ?? oldLead.age,
      purpose: body.purpose ?? oldLead.purpose,
      currentStatus: body.currentStatus ?? oldLead.currentStatus,
      bestTimeToReach: body.bestTimeToReach ?? oldLead.bestTimeToReach,
      willingToAttendTraining: body.willingToAttendTraining ?? oldLead.willingToAttendTraining,
    });

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: isDeadToNewReset
        ? { status: body.status, ...resetUpdate, completion }
        : {
            ...(body.name !== undefined && { name: body.name }),
            ...(body.phone !== undefined && { phone: body.phone }),
            ...(body.email !== undefined && { email: body.email }),
            ...(body.city !== undefined && { city: body.city }),
            ...(body.age !== undefined && { age: body.age }),
            ...(body.purpose !== undefined && { purpose: body.purpose }),
            ...(body.currentStatus !== undefined && { currentStatus: body.currentStatus }),
            ...(body.bestTimeToReach !== undefined && { bestTimeToReach: body.bestTimeToReach }),
            ...(body.willingToAttendTraining !== undefined && { willingToAttendTraining: body.willingToAttendTraining }),
            ...(body.source !== undefined && { source: body.source }),
            ...(body.status !== undefined && { status: body.status }),
            ...(body.remarks !== undefined && { remarks: body.remarks }),
            ...(body.assignedToId !== undefined && { assignedToId: body.assignedToId || null }),
            ...(body.isPriority !== undefined && { isPriority: body.isPriority }),
            ...(body.nextFollowUp !== undefined && { nextFollowUp: body.nextFollowUp ? new Date(body.nextFollowUp) : null }),
            ...followUpUpdate,
            ...slaUpdate,
            completion,
          },
    });

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

    return NextResponse.json({ success: true, message: "Lead updated successfully", data: updatedLead });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to update lead" }, { status: 500 });
  }
}
