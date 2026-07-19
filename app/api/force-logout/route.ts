import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";

export async function GET(req: NextRequest) {
  const token = await getTokenFromRequest(req);
  if (token) {
    try {
      const user = await verifyToken(token);
      await prisma.loginSession.updateMany({
        where: { token },
        data: { isExpired: true },
      });

      await logActivity({
        userId: user.id,
        action: ActivityAction.SESSION_EXPIRED,
        description: `${user.name} was force logged out`,
      });
    } catch {}
  }

  const response = NextResponse.redirect(new URL("/login", req.url));
  response.cookies.delete("token");
  return response;
}
