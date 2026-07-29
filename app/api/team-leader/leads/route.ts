import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") || null;
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 10));
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || searchParams.get("filter") || "ALL";
    const completion = searchParams.get("completion") || "ALL";

    const where: any = {
      assignedToId: auth.user.id,
      isDeleted: false,
    };

    if (status !== "ALL") where.status = status;
    if (completion !== "ALL") where.completion = completion;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: [
        { isPriority: "desc" },
        { completion: "asc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
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
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}