import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { isDeleted: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { deletedAt: "desc" },
        select: {
          id: true,
          name: true,
          phone: true,
          city: true,
          status: true,
          deletedAt: true,
          deletedBy: { select: { name: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      success: true,
      data: leads,
      pagination: { page, totalPages, total },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;
  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, message: "No lead IDs." }, { status: 400 });
    }
    await prisma.lead.updateMany({
      where: { id: { in: ids } },
      data: { isDeleted: true, deletedAt: new Date(), deletedById: auth.user.id },
    });
    await logActivity({
      userId: auth.user.id, action: ActivityAction.LEAD_SOFT_DELETED,
      description: `Soft deleted ${ids.length} leads`, metadata: { ids },
    });
    return NextResponse.json({ success: true, message: `${ids.length} leads moved to trash.` });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;
  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, message: "No lead IDs." }, { status: 400 });
    }
    await prisma.lead.updateMany({
      where: { id: { in: ids }, isDeleted: true },
      data: { isDeleted: false, deletedAt: null, deletedById: null },
    });
    await logActivity({
      userId: auth.user.id, action: ActivityAction.LEAD_RESTORED,
      description: `Restored ${ids.length} leads`, metadata: { ids },
    });
    return NextResponse.json({ success: true, message: `${ids.length} leads restored.` });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;
  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, message: "No lead IDs." }, { status: 400 });
    }
    const result = await prisma.lead.deleteMany({
      where: { id: { in: ids }, isDeleted: true },
    });
    await logActivity({
      userId: auth.user.id, action: ActivityAction.LEAD_BULK_ACTION,
      description: `Permanently deleted ${result.count} leads`,
      metadata: { action: "permanent-delete", ids },
    });
    return NextResponse.json({ success: true, message: `${result.count} leads permanently deleted.` });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}
