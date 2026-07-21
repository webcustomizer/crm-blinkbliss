import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@/app/generated/prisma/client";

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  const host = req.headers.get("host") || "";

  const isSameOrigin =
    (origin && origin === `https://${host}`) ||
    (origin && origin === `http://${host}`) ||
    (referer && referer.startsWith(`https://${host}/`)) ||
    (referer && referer.startsWith(`http://${host}/`));

  if (!isSameOrigin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

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
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
