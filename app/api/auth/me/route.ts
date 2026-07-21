import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "SALESPERSON"]);
    if ("error" in auth) return auth.error;

    return NextResponse.json({
      success: true,
      user: {
        id: auth.user.id,
        name: auth.user.name,
        role: auth.user.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to get user" },
      { status: 500 },
    );
  }
}
