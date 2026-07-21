import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

import { comparePassword, hashPassword } from "@/lib/hash";
import { validatePasswordStrength } from "@/lib/password-validator";

import { ActivityAction } from "@/app/generated/prisma/client";

import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";


export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const user = await verifyToken(token);

    if (user.role !== "SALESPERSON") {
      return NextResponse.json(
        {
          message: "Access denied",
        },
        {
          status: 403,
        },
      );
    }

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

    const settings = await prisma.cRMSetting.findFirst();
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
