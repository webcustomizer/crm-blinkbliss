import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { comparePassword } from "@/lib/hash";
import { createToken, createTempToken } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";
import { rateLimit } from "@/lib/rate-limit";
import { generateOTP, getOTPEmailTemplate } from "@/lib/email";
import { sendEmailDirect } from "@/lib/email-sender";

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const body = await req.json();
  const { email, password } = body;

  // Rate limit check
  if (!(await rateLimit(ip, "login"))) {
    return NextResponse.json(
      { message: "Too many login attempts. Please try again later." },
      { status: 429 },
    );
  }

  if (!email || !password) {
    return NextResponse.json(
      { message: "Email and password are required." },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 },
      );
    }

    // Check if account is locked due to too many failed attempts
    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
      const minutesLeft = Math.ceil(
        (new Date(user.lockedUntil).getTime() - Date.now()) / 60000,
      );
      return NextResponse.json(
        { message: `Account locked. Try again in ${minutesLeft} minute(s).` },
        { status: 423 },
      );
    }

    // If lock has expired, reset failed attempts counter
    if (user.lockedUntil && new Date() >= new Date(user.lockedUntil)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: "Your account has been disabled. Contact admin." },
        { status: 403 },
      );
    }

    const passwordMatched = await comparePassword(password, user.password);

    if (!passwordMatched) {
      // Track failed attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const lockUntil =
        failedAttempts >= 5
          ? new Date(Date.now() + 15 * 60 * 1000) // 15 min lock
          : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil: lockUntil,
        },
      });

      await logActivity({
        userId: user.id,
        action: ActivityAction.PASSWORD_FAILED,
        description: `Failed login attempt ${failedAttempts}`,
        metadata: { ip },
      });

      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 },
      );
    }

    // Check if 2FA is required
    const settings = await getCachedCRMSettings();
    const require2FA = settings?.twoFactorRequired || user.twoFactorEnabled;

    if (require2FA) {
      // Generate OTP and send email on first attempt
      const otp = generateOTP();
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: otp, otpExpiresAt: new Date() },
      });

      const html = getOTPEmailTemplate(otp, user.name);
      await sendEmailDirect({ to: user.email, subject: `🔐 Your Login Code: ${otp}`, html });

      const masked = user.email.replace(/(.{3}).*(@.*)/, "$1***$2");
      const tempToken = createTempToken(user.id, user.email);
      console.log("2FA: tempToken created for user", user.id, "token length:", tempToken.length);

      return NextResponse.json({
        success: true,
        require2FA: true,
        message: `Code sent to ${masked}`,
        tempToken,
      });
    }

    // Reset failed attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    // Create JWT with session-based expiry from settings
    const sessionHours = settings?.sessionMaxHours || 168; // default 7 days
    const token = await createToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const cookieStore = await cookies();
    const maxAgeSeconds = sessionHours * 3600;

    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: maxAgeSeconds,
    });

    // Track device session with expiry
    const ua = req.headers.get("user-agent") || "";
    const browser = ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : ua.includes("Safari") ? "Safari" : "Unknown";
    const os = ua.includes("Windows") ? "Windows" : ua.includes("Mac") ? "Mac" : ua.includes("Linux") ? "Linux" : ua.includes("Android") ? "Android" : ua.includes("iPhone") ? "iOS" : "Unknown";
    const deviceType = ua.includes("Mobile") ? "mobile" : "desktop";

    await prisma.loginSession.create({
      data: {
        userId: user.id,
        token,
        deviceName: `${browser} on ${os}`,
        deviceType,
        browser,
        os,
        ipAddress: ip,
        expiresAt: new Date(Date.now() + maxAgeSeconds * 1000),
      },
    });

    await logActivity({
      userId: user.id,
      action: ActivityAction.LOGIN,
      description: `${user.name} logged in`,
      metadata: { email: user.email, role: user.role, ip },
    });

    return NextResponse.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Something went wrong." },
      { status: 500 },
    );
  }
}
