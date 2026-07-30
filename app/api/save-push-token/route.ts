import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "SALESPERSON", "TEAM_LEAD"]);
    if ("error" in auth) return auth.error;

    let body: { token?: unknown };
    try {
      body = await req.json();
    } catch {
      console.error("save-push-token: invalid JSON body");
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 },
      );
    }

    const pushToken =
      typeof body?.token === "string" ? body.token.trim() : null;

    if (!pushToken) {
      console.warn("save-push-token: missing or empty token for user", auth.user.id);
      return NextResponse.json(
        { message: "Push token is required" },
        { status: 400 },
      );
    }

    await prisma.pushToken.upsert({
      where: { token: pushToken },
      update: { userId: auth.user.id },
      create: { userId: auth.user.id, token: pushToken },
    });

    console.log("save-push-token: saved token for user", auth.user.id);

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