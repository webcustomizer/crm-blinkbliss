import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "SALESPERSON"]);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const { token: pushToken } = body;

    if (!pushToken) {
      return NextResponse.json(
        { message: "Push token is required" },
        { status: 400 },
      );
    }

    // Avoid duplicate entries for the same token
    const existing = await prisma.pushToken.findFirst({
      where: { token: pushToken },
    });

    if (existing) {
      // Token already saved — just make sure it's linked to the current user
      if (existing.userId !== auth.user.id) {
        await prisma.pushToken.update({
          where: { id: existing.id },
          data: { userId: auth.user.id },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Push token already registered",
      });
    }

    await prisma.pushToken.create({
      data: {
        userId: auth.user.id,
        token: pushToken,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Push token saved successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 },
    );
  }
}
