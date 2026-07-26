import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { notifyEligible } from "@/lib/notify-eligible";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });

    await prisma.user.update({
      where: { id },
      data: { eligibleForTeamLeader: true, eligibleSince: new Date() },
    });

    const response = NextResponse.json({ success: true, message: `${user.name} marked as eligible for Team Leader.` });

    after(() => notifyEligible({ userId: id, userName: user.name || "A salesperson" }).catch((err) =>
      console.error("❌ Eligible notification failed:", err),
    ));

    return response;
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}
