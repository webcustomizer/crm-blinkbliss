import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

    const salespersonId = user.id;

    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "ALL";
    const completion = searchParams.get("completion") || "ALL";
    const cursor = searchParams.get("cursor") || null;
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 10));

    const where = {
      isDeleted: false,
      assignedToId: salespersonId,

      ...(status !== "ALL" && { status: status as any }),
      ...(completion !== "ALL" && { completion: completion as any }),

      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search } },
          { city: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const leads = await prisma.lead.findMany({
      where,
      orderBy: [{ isPriority: "desc" }, { completion: "asc" }, { createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        city: true,
        age: true,
        purpose: true,
        status: true,
        completion: true,
        isPriority: true,
        remarks: true,
        nextFollowUp: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const hasMore = leads.length > limit;
    if (hasMore) leads.pop();
    const nextCursor = leads.length > 0 ? leads[leads.length - 1].id : null;

    return NextResponse.json({
      success: true,
      leads,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Salesperson Leads Error:", error);

    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 },
    );
  }
}
