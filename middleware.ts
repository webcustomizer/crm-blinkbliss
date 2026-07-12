import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

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
