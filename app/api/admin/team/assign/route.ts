import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { notifyRoleChange } from "@/lib/notify-role-change";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { userId, teamLeaderId } = await req.json();

    if (!userId) return NextResponse.json({ success: false, message: "userId is required." }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });

    if (teamLeaderId) {
      const tl = await prisma.user.findUnique({ where: { id: teamLeaderId } });
      if (!tl || tl.role !== "TEAM_LEAD") return NextResponse.json({ success: false, message: "Team Leader not found." }, { status: 404 });

      const settings = await getCachedCRMSettings();
      const maxTeamSize = settings?.tlMaxTeamSize ?? 10;
      const currentCount = await prisma.user.count({
        where: { teamLeaderId, isActive: true, role: "SALESPERSON" },
      });
      if (currentCount >= maxTeamSize) {
        return NextResponse.json(
          { success: false, message: `Team is full. Maximum ${maxTeamSize} members allowed.` },
          { status: 400 },
        );
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        teamLeaderId: teamLeaderId || null,
        teamAssignedAt: teamLeaderId ? new Date() : null,
      },
    });

    const response = NextResponse.json({ success: true });

    if (teamLeaderId) {
      const tl = await prisma.user.findUnique({ where: { id: teamLeaderId }, select: { name: true } });
      after(() => notifyRoleChange({ userId, type: "assigned", teamLeaderName: tl?.name || "your team leader" }).catch((err) =>
        console.error("Assign notification failed:", err),
      ));
    }

    return response;
  } catch {
    return NextResponse.json({ success: false, message: "Failed to assign." }, { status: 500 });
  }
}