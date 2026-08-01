import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";
import { checkLeadCompletion } from "@/lib/lead-completion";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
        followups: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { user: { select: { id: true, name: true } } },
        },
        statusHistory: {
          orderBy: { changedAt: "desc" },
          take: 50,
          include: { changedBy: { select: { id: true, name: true } } },
        },
      },
    });

    if (!lead || lead.isDeleted) {
      return NextResponse.json({ success: false, message: "Lead not found." }, { status: 404 });
    }

    const teamMemberIds = (
      await prisma.user.findMany({
        where: { teamLeaderId: auth.user.id },
        select: { id: true },
      })
    ).map((u) => u.id);

    const allIds = [auth.user.id, ...teamMemberIds];
    if (!allIds.includes(lead.assignedToId || "")) {
      return NextResponse.json({ success: false, message: "Lead not in your team." }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: lead });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;
  const user = auth.user;

  try {
    const { id } = await params;
    const body = await req.json();

    const teamMemberIds = (
      await prisma.user.findMany({ where: { teamLeaderId: user.id }, select: { id: true } })
    ).map((u) => u.id);
    const allIds = [user.id, ...teamMemberIds];

    const lead = await prisma.lead.findFirst({
      where: { id, isDeleted: false, assignedToId: { in: allIds } },
    });

    if (!lead) {
      return NextResponse.json({ success: false, message: "Lead not found." }, { status: 404 });
    }

    // Note-only save
    // No separate ActivityLog entry here — the FollowUp(0) record itself
    // is what the admin timeline renders as a "Note added" event.
    // Logging it again via logActivity used to create a duplicate
    // "Remark updated" event alongside it.
    if (body.isNote) {
      const remarksText = (body.remarks || "").trim();
      if (!remarksText) {
        return NextResponse.json({ success: false, message: "Please write something before saving" }, { status: 400 });
      }
      if (lead.status === "JOINED" || lead.status === "DEAD") {
        return NextResponse.json({ success: false, message: "Lead is closed" }, { status: 400 });
      }

      const note = await prisma.followUp.create({
        data: {
          leadId: id,
          userId: user.id,
          remarks: remarksText,
          followUpNumber: 0,
        },
        include: { user: { select: { id: true, name: true } } },
      });

      if (!lead.firstResponseAt) {
        await prisma.lead.update({ where: { id }, data: { firstResponseAt: new Date() } });
      }

      return NextResponse.json({ success: true, message: "Note saved successfully", note });
    }

    // Update lead information fields (one-time add only)
    const dataToUpdate: Record<string, unknown> = {};
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    function addChange(field: string, oldValue: unknown, newValue: unknown) {
      if (newValue !== undefined && newValue !== "" && oldValue !== newValue) {
        changes[field] = { old: oldValue || null, new: newValue };
      }
    }

    if (!lead.name && body.name) {
      dataToUpdate.name = body.name;
      addChange("name", lead.name, body.name);
    }
    if (!lead.email && body.email) {
      dataToUpdate.email = body.email;
      addChange("email", lead.email, body.email);
    }
    if (!lead.city && body.city) {
      dataToUpdate.city = body.city;
      addChange("city", lead.city, body.city);
    }
    if (!lead.age && body.age) {
      dataToUpdate.age = Number(body.age);
      addChange("age", lead.age, Number(body.age));
    }
    if (!lead.purpose && body.purpose) {
      dataToUpdate.purpose = body.purpose;
      addChange("purpose", lead.purpose, body.purpose);
    }
    if (!lead.currentStatus && body.currentStatus) {
      dataToUpdate.currentStatus = body.currentStatus;
      addChange("currentStatus", lead.currentStatus, body.currentStatus);
    }
    if (!lead.bestTimeToReach && body.bestTimeToReach) {
      dataToUpdate.bestTimeToReach = body.bestTimeToReach;
      addChange("bestTimeToReach", lead.bestTimeToReach, body.bestTimeToReach);
    }
    if (lead.willingToAttendTraining === null && body.willingToAttendTraining !== undefined) {
      const training = body.willingToAttendTraining === "YES";
      dataToUpdate.willingToAttendTraining = training;
      addChange("willingToAttendTraining", lead.willingToAttendTraining, training);
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
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

    if (Object.keys(changes).length > 0) {
      await logActivity({
        userId: user.id, leadId: id, action: ActivityAction.LEAD_UPDATED,
        description: `${user.name} (TL) updated lead information`,
        metadata: { leadName: lead.name || lead.phone, changes },
      });
    }

    return NextResponse.json({ success: true, message: "Lead updated successfully", lead: updatedLead });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}