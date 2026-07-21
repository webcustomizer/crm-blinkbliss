import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { handleAPIError } from "@/lib/client-error";

export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

    const profile = await prisma.user.findUnique({
      where: {
        id: user.id,
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

    if (!profile) {
      return NextResponse.json(
        {
          message: "Profile not found",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    return handleAPIError(error, "salesperson-profile-get");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

    const body = await req.json();
    const { name, phone } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { message: "Name must be at least 2 characters" },
        { status: 400 },
      );
    }

    if (phone !== null && phone !== undefined && phone !== "" && typeof phone !== "string") {
      return NextResponse.json(
        { message: "Invalid phone number" },
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
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
    return handleAPIError(error, "salesperson-profile-put");
  }
}
