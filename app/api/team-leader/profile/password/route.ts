import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { comparePassword, hashPassword } from "@/lib/hash";
import { validatePasswordStrength } from "@/lib/password-validator";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await rateLimit(ip, "login"))) {
    return NextResponse.json({ success: false, message: "Too many requests." }, { status: 429 });
  }

  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) return NextResponse.json({ success: false, message: "All fields required." }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
    if (!user || !(await comparePassword(currentPassword, user.password))) {
      return NextResponse.json({ success: false, message: "Current password is incorrect." }, { status: 401 });
    }

    const settings = await getCachedCRMSettings();
    const validation = validatePasswordStrength(newPassword, settings?.passwordMinLength || 8, settings?.passwordRequireSpecial || false);
    if (!validation.valid) return NextResponse.json({ message: validation.errors[0] }, { status: 400 });

    await prisma.user.update({ where: { id: user.id }, data: { password: await hashPassword(newPassword), forcePasswordChange: false } });

    // Expire all sessions except current
    await prisma.loginSession.updateMany({
      where: { userId: user.id, isExpired: false },
      data: { isExpired: true },
    });

    return NextResponse.json({ success: true, message: "Password changed." });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}