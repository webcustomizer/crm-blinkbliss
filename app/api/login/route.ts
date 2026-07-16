import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/hash";
import { createToken } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 },
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: "Your account has been disabled." },
        { status: 403 },
      );
    }

    const passwordMatched = await comparePassword(password, user.password);

    if (!passwordMatched) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 },
      );
    }

    const token = await createToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    // Only set the httpOnly cookie for browser/web clients.
    // Capacitor apps can't read httpOnly cookies anyway, so they rely on the token in the JSON body below.
    const cookieStore = await cookies();

    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    // Activity Log
    await logActivity({
      userId: user.id,
      action: ActivityAction.LOGIN,
      description: `${user.name} logged into CRM`,
      metadata: {
        email: user.email,
        role: user.role,
        loginAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      token, // <-- app stores this via Preferences; web client can just ignore it
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Something went wrong.",
      },
      {
        status: 500,
      },
    );
  }
}
