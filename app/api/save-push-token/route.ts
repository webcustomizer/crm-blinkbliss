import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);

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
      if (existing.userId !== user.id) {
        await prisma.pushToken.update({
          where: { id: existing.id },
          data: { userId: user.id },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Push token already registered",
      });
    }

    await prisma.pushToken.create({
      data: {
        userId: user.id,
        token: pushToken,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Push token saved successfully",
    });
  } catch (error) {
    console.log("Save Push Token Error:", error);

    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 },
    );
  }
}
