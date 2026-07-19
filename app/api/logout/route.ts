import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";

export async function POST(req: NextRequest) {
  try {
    const token = await getTokenFromRequest(req);
    const cookieStore = await cookies();

    if (token) {
      try {
        const user = await verifyToken(token);

        // Expire this login session
        await prisma.loginSession.updateMany({
          where: { token },
          data: { isExpired: true },
        });

        await logActivity({
          userId: user.id,
          action: ActivityAction.LOGOUT,
          description: `${user.name} logged out`,
          metadata: { email: user.email, role: user.role },
        });
      } catch {
        // Token may already be expired, still clear session
        await prisma.loginSession.updateMany({
          where: { token },
          data: { isExpired: true },
        });
      }
    }

    cookieStore.delete("token");
    return NextResponse.json({ success: true });
  } catch {
    const cookieStore = await cookies();
    cookieStore.delete("token");
    return NextResponse.json({ success: true });
  }
}
