import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { requireAuth, invalidateSessionCache } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { notifyRoleChange } from "@/lib/notify-role-change";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    if (user.role !== "SALESPERSON") return NextResponse.json({ success: false, message: "User is not a salesperson." }, { status: 400 });

    const existingTeam = await prisma.team.findUnique({ where: { leaderId: id } });
    if (existingTeam) return NextResponse.json({ success: false, message: "User already leads a team." }, { status: 400 });

    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { role: "TEAM_LEAD" } }),
      prisma.team.create({ data: { name: `${user.name}'s Team`, leaderId: id } }),
    ]);

    // Expire all existing sessions so the user is forced to re-login
    const sessions = await prisma.loginSession.findMany({
      where: { userId: id, isExpired: false },
      select: { token: true },
    });
    await prisma.loginSession.updateMany({
      where: { userId: id, isExpired: false },
      data: { isExpired: true },
    });
    for (const s of sessions) invalidateSessionCache(s.token);

    const response = NextResponse.json({ success: true, message: "Salesperson promoted to Team Leader." });

    after(() => notifyRoleChange({ userId: id, type: "promoted" }).catch((err) =>
      console.error("Promote notification failed:", err),
    ));

    return response;
  } catch {
    return NextResponse.json({ success: false, message: "Failed to promote." }, { status: 500 });
  }
}