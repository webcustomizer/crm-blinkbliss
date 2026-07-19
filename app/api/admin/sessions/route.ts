import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const allUsers = searchParams.get("all") === "true";

    let sessions;
    if (allUsers) {
      sessions = await prisma.loginSession.findMany({
        where: { isExpired: false },
        orderBy: { lastActiveAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      });
    } else {
      sessions = await prisma.loginSession.findMany({
        where: { userId: auth.user.id },
        orderBy: { lastActiveAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      });
    }

    const currentToken = req.cookies.get("token")?.value || "";

    return NextResponse.json({
      success: true,
      data: sessions.map((s) => ({
        id: s.id,
        userId: s.userId,
        userName: s.user?.name || "Unknown",
        userEmail: s.user?.email || "",
        userRole: s.user?.role || "",
        deviceName: s.deviceName,
        deviceType: s.deviceType,
        browser: s.browser,
        os: s.os,
        ipAddress: s.ipAddress,
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isCurrent: s.token === currentToken,
      })),
    });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to fetch sessions." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const { sessionIds } = body;

    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json({ success: false, message: "No session IDs provided." }, { status: 400 });
    }

    await prisma.loginSession.deleteMany({
      where: { id: { in: sessionIds } },
    });

    await logActivity({
      userId: auth.user.id,
      action: ActivityAction.FORCE_LOGOUT,
      description: `Force logged out ${sessionIds.length} session(s)`,
      metadata: { sessionIds },
    });

    return NextResponse.json({ success: true, message: "Sessions terminated." });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to terminate sessions." }, { status: 500 });
  }
}
