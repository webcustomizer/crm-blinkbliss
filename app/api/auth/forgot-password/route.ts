import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResetToken, getResetPasswordTemplate } from "@/lib/email";
import { sendEmailDirect } from "@/lib/email-sender";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await rateLimit(ip, "login"))) {
    return NextResponse.json({ success: false, message: "Too many requests." }, { status: 429 });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ success: false, message: "Email is required." }, { status: 400 });
    }

    // Check if forgot password is enabled in settings
    const settings = await prisma.cRMSetting.findFirst();
    if (!settings?.forgotPasswordEnabled) {
      return NextResponse.json({ success: false, message: "Password reset is currently disabled." }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user || !user.isActive) {
      return NextResponse.json({ success: true, message: "If the email exists, a reset link has been sent." });
    }

    // Generate reset token — store in twoFactorSecret (reused) + set expiry
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: `reset:${resetToken}`,
        lockedUntil: expiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      || `https://${req.headers.get("x-forwarded-host") || req.headers.get("host") || "crm-blinkbliss.vercel.app"}`;
    const resetLink = `${appUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    const html = getResetPasswordTemplate(resetLink, user.name);

    await sendEmailDirect({ to: user.email, subject: "Reset Your Password — Blink & Bliss", html });

    return NextResponse.json({ success: true, message: "If the email exists, a reset link has been sent." });
  } catch {
    return NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });
  }
}
