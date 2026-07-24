import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { createToken, verifyTempToken } from "@/lib/auth";
import { isOTPExpired, safeStringCompare } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

function getIP(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  if (!(await rateLimit(ip, "login"))) {
    return NextResponse.json(
      { success: false, message: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  try {
    const { tempToken, otp } = await req.json();
    if (!tempToken || !otp) {
      return NextResponse.json({ success: false, message: "Missing data." }, { status: 400 });
    }

    const tok = verifyTempToken(tempToken);
    if (!tok.valid) {
      console.error("2FA tempToken verification failed:", tok.reason);
      return NextResponse.json({ success: false, message: "Invalid or expired session." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: tok.userId } });
    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, message: "Account not found." }, { status: 401 });
    }
    if (user.otpExpiresAt && isOTPExpired(user.otpExpiresAt)) {
      return NextResponse.json({ success: false, message: "Invalid code." }, { status: 401 });
    }
    if (!user.twoFactorSecret || !safeStringCompare(user.twoFactorSecret, otp)) {
      return NextResponse.json({ success: false, message: "Invalid code." }, { status: 401 });
    }
    const settings = await getCachedCRMSettings();
    const hours = settings?.sessionMaxHours || 168;
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: null, otpExpiresAt: null, failedLoginAttempts: 0 },
    });
    const token = await createToken({ id: user.id, name: user.name, email: user.email, role: user.role }, `${hours}h`);
    const ck = await cookies();
    ck.set("token", token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: hours * 3600,
    });
    const ua = req.headers.get("user-agent") || "";
    const isCapacitor = ua.includes("Capacitor");
    const browser = isCapacitor ? "App" : ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : ua.includes("Safari") ? "Safari" : "Unknown";
    const os = ua.includes("Android") ? "Android" : ua.includes("iPhone") || ua.includes("iPad") ? "iOS" : ua.includes("Windows") ? "Windows" : ua.includes("Mac") ? "Mac" : ua.includes("Linux") ? "Linux" : "Unknown";
    const deviceType = ua.includes("Mobile") ? "mobile" : "desktop";

    await prisma.loginSession.create({
      data: {
        userId: user.id, token,
        deviceName: `${browser} on ${os}`,
        deviceType,
        browser,
        os,
        ipAddress: ip,
        expiresAt: new Date(Date.now() + hours * 3600 * 1000),
      },
    });
    return NextResponse.json({ success: true, token, user: { id: user.id, name: user.name, role: user.role } });
  } catch {
    return NextResponse.json({ success: false, message: "Verification failed." }, { status: 500 });
  }
}
