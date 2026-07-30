import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "SALESPERSON", "TEAM_LEAD"]);
    if ("error" in auth) return auth.error;

    const body = await req.json();
    const { token: pushToken } = body;

    if (!pushToken) {
      return NextResponse.json(
        { message: "Push token is required" },
        { status: 400 },
      );
    }

    // Upsert on the unique `token` column instead of findFirst-then-create.
    // The old check-then-act pattern raced under concurrent registration
    // attempts (e.g. two effects firing near-simultaneously on the client)
    // and threw an unhandled unique constraint error on `create`.
    await prisma.pushToken.upsert({
      where: { token: pushToken },
      update: { userId: auth.user.id },
      create: { userId: auth.user.id, token: pushToken },
    });

    return NextResponse.json({
      success: true,
      message: "Push token saved successfully",
    });
  } catch (error) {
    console.error("save-push-token failed:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 },
    );
  }
}