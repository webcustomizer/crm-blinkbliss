import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  const settings = await getCachedCRMSettings();
  if (settings && settings.tlTeamLeadsEnabled === false) {
    return NextResponse.json(
      { success: false, message: "Team leads view is disabled by admin." },
      { status: 403 },
    );
  }

  try {
    const teamMemberIds = (
      await prisma.user.findMany({
        where: { teamLeaderId: auth.user.id },
        select: { id: true },
      })
    ).map((u) => u.id);

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") || null;
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 10));
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "ALL";
    const completion = searchParams.get("completion") || "ALL";
    const memberId = searchParams.get("memberId") || "";
    const scope = searchParams.get("scope") || "all"; // all | self | team

    let where: any = {
      isDeleted: false,
    };

    // Scope: self = TL only, team = team members only, all = everyone
    if (scope === "self") {
      where.assignedToId = auth.user.id;
    } else if (scope === "team") {
      where.assignedToId = teamMemberIds.length > 0 ? { in: teamMemberIds } : { in: ["__none__"] };
    } else {
      where.assignedToId = { in: [auth.user.id, ...teamMemberIds] };
    }

    // memberId filter overrides scope when set
    if (memberId === "self") {
      where.assignedToId = auth.user.id;
    } else if (memberId) {
      where.assignedToId = memberId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    if (completion !== "ALL") {
      where.status = completion === "COMPLETED" ? { in: ["JOINED", "DEAD"] } : { notIn: ["JOINED", "DEAD"] };
    } else if (filter !== "ALL") {
      where.status = filter;
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: [{ isPriority: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        skip: cursor ? 1 : 0,
        ...(cursor ? { cursor: { id: cursor } } : {}),
        select: {
          id: true, name: true, phone: true, email: true, city: true,
          source: true, status: true, followUpCount: true, nextFollowUp: true,
          createdAt: true, isPriority: true,
          assignedTo: { select: { id: true, name: true } },
        },
      }),
    ]);

    const hasMore = leads.length > limit;
    if (hasMore) leads.pop();
    const nextCursor = leads.length > 0 ? leads[leads.length - 1].id : null;

    return NextResponse.json({
      success: true,
      data: leads,
      total,
      nextCursor,
      hasMore,
    });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}