import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/hash";
import { generateOTP, getOTPEmailTemplate } from "@/lib/email";
import { sendEmailDirect } from "@/lib/email-sender";
import { rateLimit } from "@/lib/rate-limit";
import { createTempToken } from "@/lib/auth";

function getIP(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  if (!(await rateLimit(ip, "login"))) {
    return NextResponse.json({ success: false, message: "Too many attempts. Try again." }, { status: 429 });
  }

  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Email and password required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, message: "Invalid credentials." }, { status: 401 });
    }

    const settings = await prisma.cRMSetting.findFirst();
    const require2FA = settings?.twoFactorRequired || user.twoFactorEnabled;
    if (!require2FA) {
      return NextResponse.json({ success: true, require2FA: false });
    }

    const ok = await comparePassword(password, user.password);
    if (!ok) {
      return NextResponse.json({ success: false, message: "Invalid credentials." }, { status: 401 });
    }

    const otp = generateOTP();
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: otp, otpExpiresAt: new Date() },
    });

    // Send OTP via email
    const html = getOTPEmailTemplate(otp, user.name);
    await sendEmailDirect({ to: user.email, subject: `🔐 Your Login Code: ${otp}`, html });

    const masked = user.email.replace(/(.{3}).*(@.*)/, "$1***$2");
    const tempToken = createTempToken(user.id, user.email);

    return NextResponse.json({ success: true, require2FA: true, message: `Code sent to ${masked}`, tempToken });
  } catch {
    return NextResponse.json({ success: false, message: "Something went wrong." }, { status: 500 });
  }
}
