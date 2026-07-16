import { NextRequest, NextResponse } from "next/server";
<<<<<<< HEAD
import { verifyToken, getTokenFromRequest } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const token = await getTokenFromRequest(request);
=======
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
>>>>>>> 5e96d00d42fe7cff1606cae559d9204f95fff3e3

  const { pathname } = request.nextUrl;

  // Public Routes
  if (pathname === "/" || pathname === "/login") {
    if (!token) {
      return NextResponse.next();
    }

    try {
      const user = await verifyToken(token);

      if (user.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }

      return NextResponse.redirect(new URL("/sales/dashboard", request.url));
    } catch {
      return NextResponse.next();
    }
  }

  // Protected Routes
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const user = await verifyToken(token);

    // Admin Routes
    if (pathname.startsWith("/admin") && user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/sales/dashboard", request.url));
    }

    // Sales Routes
    if (pathname.startsWith("/sales") && user.role !== "SALESPERSON") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));

    response.cookies.delete("token");

    return response;
  }
}

export const config = {
  matcher: ["/login", "/admin/:path*", "/sales/:path*"],
};
