import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { requireAuth } from "@/lib/require-auth";

import { comparePassword, hashPassword } from "@/lib/hash";
import { validatePasswordStrength } from "@/lib/password-validator";
import { rateLimit } from "@/lib/rate-limit";

import { ActivityAction } from "@/app/generated/prisma/client";

import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";


export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!(await rateLimit(ip, "login"))) {
      return NextResponse.json(
        { message: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

    const body = await req.json();

    const currentPassword = body.currentPassword?.trim();

    const newPassword = body.newPassword?.trim();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        {
          message: "All fields are required",
        },
        {
          status: 400,
        },
      );
    }

    const settings = await getCachedCRMSettings();
    const minLen = settings?.passwordMinLength || 8;
    const requireSpecial = settings?.passwordRequireSpecial || false;

    const validation = validatePasswordStrength(newPassword, minLen, requireSpecial);
    if (!validation.valid) {
      return NextResponse.json(
        { message: validation.errors[0] },
        { status: 400 },
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        {
          message: "User not found",
        },
        {
          status: 404,
        },
      );
    }

    const passwordMatch = await comparePassword(
      currentPassword,
      dbUser.password,
    );

    if (!passwordMatch) {
      return NextResponse.json(
        {
          message: "Current password is incorrect",
        },
        {
          status: 400,
        },
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.loginSession.updateMany({
        where: { userId: user.id, isExpired: false },
        data: { isExpired: true },
      }),
    ]);

    await logActivity({
      userId: user.id,

      action: ActivityAction.PASSWORD_CHANGED,

      description: `${user.name} changed account password`,

      metadata: {
        type: "PASSWORD_CHANGE",
      },
    });

    return NextResponse.json(
      {
        success: true,

        message: "Password changed successfully",
      },
      {
        status: 200,
      },
    );
  } catch (error) {


    return NextResponse.json(
      {
        message: "Something went wrong",
      },
      {
        status: 500,
      },
    );
  }
}
