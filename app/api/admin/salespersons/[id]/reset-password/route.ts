import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { requireAuth } from "@/lib/require-auth";
import { hashPassword } from "@/lib/hash";
import { validatePasswordStrength } from "@/lib/password-validator";
import { rateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await rateLimit(ip, "api"))) {
    return NextResponse.json(
      { message: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const { id } = await context.params;
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ message: "Password is required." }, { status: 400 });
    }

    const settings = await getCachedCRMSettings();
    const validation = validatePasswordStrength(
      password,
      settings?.passwordMinLength || 8,
      settings?.passwordRequireSpecial || false,
    );
    if (!validation.valid) {
      return NextResponse.json({ message: validation.errors[0] }, { status: 400 });
    }

    const salesperson = await prisma.user.findUnique({ where: { id, role: "SALESPERSON" } });
    if (!salesperson) {
      return NextResponse.json({ message: "Salesperson not found." }, { status: 404 });
    }

    const hashedPassword = await hashPassword(password);

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { password: hashedPassword },
        select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
      }),
      prisma.loginSession.updateMany({
        where: { userId: id, isExpired: false },
        data: { isExpired: true },
      }),
    ]);

    await logActivity({
      userId: auth.user.id,
      action: ActivityAction.PASSWORD_CHANGED,
      description: `${auth.user.name} reset password for ${salesperson.name}`,
      metadata: { type: "ADMIN_PASSWORD_RESET", targetUserId: id },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully.",
      user: updatedUser,
    });
  } catch {
    return NextResponse.json(
      { message: "Something went wrong." },
      { status: 500 },
    );
  }
}
