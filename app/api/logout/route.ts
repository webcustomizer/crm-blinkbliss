import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { verifyToken } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";

export async function POST() {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("token")?.value;

    if (token) {
      const user = await verifyToken(token);

      await logActivity({
        userId: user.id,
        action: ActivityAction.LOGOUT,
        description: `${user.name} logged out`,
        metadata: {
          email: user.email,
          role: user.role,
        },
      });
    }

    cookieStore.delete("token");

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Logout Error:", error);

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
