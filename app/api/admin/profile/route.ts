import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { handleAPIError } from "@/lib/client-error";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN"]);
    if ("error" in auth) return auth.error;

    const profile = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ message: "Profile not found" }, { status: 404 });
    }

    const lastSession = await prisma.loginSession.findFirst({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const [totalLeads, totalSalespersons, totalCustomers] = await prisma.$transaction([
      prisma.lead.count({ where: { isDeleted: false } }),
      prisma.user.count({ where: { role: "SALESPERSON" } }),
      prisma.lead.count({ where: { isDeleted: false, status: "JOINED" } }),
    ]);

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        lastLoginAt: lastSession?.createdAt?.toISOString() ?? null,
      },
      stats: { totalLeads, totalSalespersons, totalCustomers },
    });
  } catch (error) {
    return handleAPIError(error, "admin-profile-get");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN"]);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const { name, phone } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ message: "Name must be at least 2 characters" }, { status: 400 });
    }

    if (phone !== null && phone !== undefined && phone !== "" && typeof phone !== "string") {
      return NextResponse.json({ message: "Invalid phone number" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    return handleAPIError(error, "admin-profile-put");
  }
}
