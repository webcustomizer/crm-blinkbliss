import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextAutoAssignee } from "@/lib/auto-assign";
import { notifyLeadAssigned } from "@/lib/notify-lead-assigned";
import { requireAuth } from "@/lib/require-auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";
import { checkLeadCompletion } from "@/lib/lead-completion";
import { withRateLimit } from "@/lib/api-rate-limit";

const GOOGLE_SHEET_WEBHOOK = process.env.GOOGLE_SHEET_WEBHOOK;

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

function getPKTDayBoundary(daysOffset: number, endOfDay: boolean) {
  const pktNow = new Date(Date.now() + PKT_OFFSET_MS);
  const year = pktNow.getUTCFullYear();
  const month = pktNow.getUTCMonth();
  const day = pktNow.getUTCDate() + daysOffset;
  const boundaryInPKT = endOfDay
    ? new Date(Date.UTC(year, month, day, 23, 59, 59, 999))
    : new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  return new Date(boundaryInPKT.getTime() - PKT_OFFSET_MS);
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "ALL";
    const salespersonId = searchParams.get("salespersonId") || "";
    const source = searchParams.get("source") || "";
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    if (salespersonId) where.assignedToId = salespersonId;
    if (source) where.source = { equals: source, mode: "insensitive" };
    // Exclude soft-deleted leads by default
    where.isDeleted = false;

    if (filter !== "ALL") {
      if (filter === "INCOMPLETE") {
        where.completion = "INCOMPLETE";
      } else if (filter === "UNASSIGNED") {
        where.assignedToId = null;
      } else if (filter === "TODAY_FOLLOW_UP") {
        const start = getPKTDayBoundary(0, false);
        const end = getPKTDayBoundary(0, true);
        where.nextFollowUp = { gte: start, lte: end };
        where.status = { notIn: ["JOINED", "DEAD"] };
      } else if (filter === "OVERDUE_FOLLOW_UP") {
        const todayStart = getPKTDayBoundary(0, false);
        where.nextFollowUp = { lt: todayStart };
        where.status = { notIn: ["JOINED", "DEAD"] };
      } else {
        where.status = filter;
      }
    }

    const total = await prisma.lead.count({ where });
    const leads = await prisma.lead.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      success: true,
      data: leads,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch leads." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const limited = withRateLimit(req, "form");
  if (limited) return limited;

  try {
    const body = await req.json();
    const {
      name, phone, email, city, age, purpose, currentStatus,
      bestTimeToReach, willingToAttendTraining, source,
    } = body;

    if (!phone) {
      return NextResponse.json({ success: false, message: "Phone is required." }, { status: 400 });
    }

    const existingPhone = await prisma.lead.findFirst({
      where: { phone, isDeleted: false },
    });
    if (existingPhone) {
      return NextResponse.json({ success: false, message: "A lead with this phone number already exists." }, { status: 409 });
    }

    // Check for exact phone match OR email match (both phone AND email are unique)
    if (email && email.trim() !== "") {
      const existingEmail = await prisma.lead.findFirst({
        where: { email: email.trim(), isDeleted: false },
      });
      if (existingEmail) {
        return NextResponse.json({ success: false, message: "A lead with this email already exists." }, { status: 409 });
      }
    }

    const autoAssignedId = await getNextAutoAssignee();

    const lead = await prisma.lead.create({
      data: {
        name: name || null,
        phone,
        email: email || null,
        city: city || null,
        age: age ? Number(age) : null,
        purpose: purpose || null,
        currentStatus: currentStatus || null,
        bestTimeToReach: bestTimeToReach || null,
        willingToAttendTraining: willingToAttendTraining ?? null,
        source: source || null,
        status: "NEW",
        completion: checkLeadCompletion({ name, phone, email, city, age: age ? Number(age) : null, purpose, currentStatus, bestTimeToReach, willingToAttendTraining }),
        remarks: null,
        assignedToId: autoAssignedId,
      },
    });

    if (autoAssignedId) {
      await notifyLeadAssigned({ userId: autoAssignedId, leadId: lead.id, leadName: lead.name });
    }

    if (GOOGLE_SHEET_WEBHOOK) {
      try {
        await fetch(GOOGLE_SHEET_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: lead.id, name: lead.name, phone: lead.phone, email: lead.email,
            city: lead.city, age: lead.age, purpose: lead.purpose,
            currentStatus: lead.currentStatus, bestTimeToReach: lead.bestTimeToReach,
            willingToAttendTraining: lead.willingToAttendTraining,
            source: lead.source, assignedTo: autoAssignedId ?? "", createdAt: lead.createdAt,
          }),
        });
      } catch { /* ignore google sheet errors */ }
    }

    return NextResponse.json({ success: true, message: "Lead created successfully.", data: lead });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ success: false, message: "A lead with this phone number already exists." }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Something went wrong." }, { status: 500 });
  }
}

// BULK ACTIONS
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const { ids, action, value } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, message: "No lead IDs provided." }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ success: false, message: "No action specified." }, { status: 400 });
    }

    let updateData: any = {};
    let description = "";

    switch (action) {
      case "status":
        updateData.status = value;
        if (value === "DEAD") {
          updateData.nextFollowUp = null;
        }
        description = `Bulk status change to ${value} for ${ids.length} leads`;
        break;
      case "assign": {
        // Validate salesperson if assigning (not unassigning)
        if (value) {
          const sp = await prisma.user.findFirst({
            where: { id: value, role: "SALESPERSON", isActive: true },
          });
          if (!sp) {
            return NextResponse.json({ success: false, message: "Salesperson not found or inactive." }, { status: 400 });
          }
        }
        updateData.assignedToId = value || null;
        description = `Bulk ${value ? "assign" : "unassign"} ${ids.length} leads`;
        break;
      }
      case "delete":
        await prisma.lead.updateMany({
          where: { id: { in: ids }, isDeleted: false },
          data: { isDeleted: true, deletedAt: new Date(), deletedById: auth.user.id },
        });
        await logActivity({
          userId: auth.user.id,
          action: ActivityAction.LEAD_BULK_ACTION,
          description: `Soft-deleted ${ids.length} leads`,
          metadata: { ids, action: "delete" },
        });
        return NextResponse.json({ success: true, message: `${ids.length} leads deleted.` });
      default:
        return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 });
    }

    await prisma.lead.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    // Send notifications for bulk assign
    if (action === "assign" && value) {
      const leads = await prisma.lead.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      });
      for (const lead of leads) {
        notifyLeadAssigned({ userId: value, leadId: lead.id, leadName: lead.name }).catch(() => {});
      }
    }

    await logActivity({
      userId: auth.user.id,
      action: ActivityAction.LEAD_BULK_ACTION,
      description,
      metadata: { ids, action, value },
    });

    return NextResponse.json({ success: true, message: `Updated ${ids.length} leads.` });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Bulk action failed." }, { status: 500 });
  }
}