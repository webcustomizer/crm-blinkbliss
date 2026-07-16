import { NextRequest, NextResponse } from "next/server";
import { verifyToken, TokenPayload } from "@/lib/auth";

/**
 * Verifies the caller is authenticated and has one of the allowed roles.
 * Checks both the httpOnly cookie (web) and the Authorization: Bearer
 * header (Capacitor app), matching how /api/login issues the token.
 *
 * Usage inside a route handler:
 *
 *   const auth = await requireAuth(req, ["ADMIN"]);
 *   if ("error" in auth) return auth.error;
 *   // auth.user.id / auth.user.role available here
 */
export async function requireAuth(
  req: NextRequest,
  allowedRoles: Array<"ADMIN" | "SALESPERSON">,
): Promise<{ user: TokenPayload } | { error: NextResponse }> {
  const cookieToken = req.cookies.get("token")?.value;

  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const token = cookieToken || bearerToken;

  if (!token) {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  try {
    const user = await verifyToken(token);

    if (!allowedRoles.includes(user.role)) {
      return {
        error: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
      };
    }

    return { user };
  } catch {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }
}
