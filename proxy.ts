import { NextRequest, NextResponse } from "next/server";
import { verifyToken, getTokenFromRequest } from "@/lib/auth";
import { isSessionActive } from "@/lib/require-auth";

// Requires the Node.js middleware runtime (stable in Next.js 15.2+/16) since
// isSessionActive() hits Prisma — the default Edge runtime can't run it.
export const runtime = "nodejs";

const LOGIN_PATH = "/login";

/**
 * Clears the auth cookie with the exact same attributes it was set with
 * (path: "/"). A mismatched path/attribute on delete is the classic way
 * a "cleared" cookie silently survives in the browser, which is what
 * produces the redirect loop this function guards against below.
 */
function clearTokenCookie(response: NextResponse) {
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function proxy(request: NextRequest) {
  const token = await getTokenFromRequest(request);
  const { pathname } = request.nextUrl;

  // Public Routes
  if (pathname === "/" || pathname === LOGIN_PATH) {
    if (!token) return NextResponse.next();
    try {
      const user = await verifyToken(token);

      // Don't trust the JWT alone — a force-logged-out or otherwise
      // terminated session still carries a cryptographically valid JWT
      // until it expires (up to 7 days). Without this check, a stale
      // cookie bounces forever between "/login" (middleware sends it to
      // the dashboard) and "/api/force-logout" (the dashboard layout
      // sends it back) => ERR_TOO_MANY_REDIRECTS.
      const active = await isSessionActive(token);
      if (!active) {
        return clearTokenCookie(NextResponse.next());
      }

      if (user.role === "ADMIN")
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      return NextResponse.redirect(new URL("/sales/dashboard", request.url));
    } catch {
      return clearTokenCookie(NextResponse.next());
    }
  }

  const isApiRoute = pathname.startsWith("/api");
  const isPublicLeadSubmission =
    pathname === "/api/admin/leads" && request.method === "POST";
  if (isPublicLeadSubmission) return NextResponse.next();

  // Protected Routes
  if (!token) {
    if (isApiRoute)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  try {
    const user = await verifyToken(token);

    const active = await isSessionActive(token);
    if (!active) {
      if (isApiRoute) {
        const response = NextResponse.json(
          { message: "Session expired" },
          { status: 401 },
        );
        return clearTokenCookie(response);
      }
      const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url));
      return clearTokenCookie(response);
    }

    if (
      (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) &&
      user.role !== "ADMIN"
    ) {
      if (isApiRoute)
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      return NextResponse.redirect(new URL("/sales/dashboard", request.url));
    }

    if (
      (pathname.startsWith("/sales") ||
        pathname.startsWith("/api/salesperson")) &&
      user.role !== "SALESPERSON"
    ) {
      if (isApiRoute)
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    return NextResponse.next();
  } catch {
    if (isApiRoute) {
      const response = NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      );
      return clearTokenCookie(response);
    }
    const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    return clearTokenCookie(response);
  }
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/admin/:path*",
    "/sales/:path*",
    "/api/admin/:path*",
    "/api/salesperson/:path*",
    "/api/upload/:path*",
  ],
};
