import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/hash";
import { validatePasswordStrength } from "@/lib/password-validator";
import { safeStringCompare } from "@/lib/email";
import { getCachedCRMSettings } from "@/lib/settings-cache";

export async function POST(req: NextRequest) {
  try {
    const { email, token, newPassword } = await req.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json({ success: false, message: "All fields are required." }, { status: 400 });
    }

    // Validate password strength
    const settings = await getCachedCRMSettings();
    const minLen = settings?.passwordMinLength || 8;
    const requireSpecial = settings?.passwordRequireSpecial || false;
    const validation = validatePasswordStrength(newPassword, minLen, requireSpecial);
    if (!validation.valid) {
      return NextResponse.json({ success: false, message: validation.errors[0] }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, message: "Invalid or expired reset link." }, { status: 400 });
    }

    // Verify reset token
    const storedSecret = user.twoFactorSecret;
    if (!storedSecret || !storedSecret.startsWith("reset:")) {
      return NextResponse.json({ success: false, message: "Invalid or expired reset link." }, { status: 400 });
    }

    const storedToken = storedSecret.replace("reset:", "");
    if (!safeStringCompare(storedToken, token)) {
      return NextResponse.json({ success: false, message: "Invalid reset token." }, { status: 400 });
    }

    // Check expiry (stored in otpExpiresAt, NOT lockedUntil — see forgot-password)
    if (user.otpExpiresAt && new Date() > new Date(user.otpExpiresAt)) {
      return NextResponse.json({ success: false, message: "Reset link has expired. Please request a new one." }, { status: 410 });
    }

    // Reset password
    const hashed = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashed,
          twoFactorSecret: null,
          otpExpiresAt: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.loginSession.updateMany({
        where: { userId: user.id, isExpired: false },
        data: { isExpired: true },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Password reset successfully. You can now login." });
  } catch {
    return NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });
  }
}
