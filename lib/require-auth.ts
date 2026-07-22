import { NextRequest, NextResponse } from "next/server";
import { verifyToken, TokenPayload } from "@/lib/auth";

/**
 * Tiny in-memory cache for session validation.
 * Avoids a DB round-trip on every authenticated API call while still
 * detecting force-terminated sessions within the TTL window.
 */
const sessionCache = new Map<string, { valid: boolean; ts: number }>();
const SESSION_CACHE_TTL = 60_000; // 60 seconds

/**
 * Confirms a token's LoginSession row still exists and isn't expired
 * (i.e. hasn't been force-terminated). Backed by the same short-lived
 * cache used by requireAuth, so proxy.ts and API routes always agree
 * on whether a session is still active — this is what keeps a valid-but
 * -force-expired JWT from bouncing between /login and a protected route.
 */
export async function isSessionActive(token: string): Promise<boolean> {
  const cached = sessionCache.get(token);
  if (cached && Date.now() - cached.ts < SESSION_CACHE_TTL) {
    return cached.valid;
  }

  const { prisma } = await import("@/lib/prisma");
  const session = await prisma.loginSession.findFirst({
    where: { token, isExpired: false },
    select: { id: true },
  });

  sessionCache.set(token, { valid: !!session, ts: Date.now() });

  // Evict stale entries periodically (every ~100 sessions)
  if (sessionCache.size > 100) {
    const now = Date.now();
    for (const [key, val] of sessionCache) {
      if (now - val.ts > SESSION_CACHE_TTL * 2) sessionCache.delete(key);
    }
  }

  return !!session;
}

/**
 * Verifies the caller is authenticated and has one of the allowed roles.
 * Checks both the httpOnly cookie (web) and the Authorization: Bearer
 * header (Capacitor app), matching how /api/login issues the token.
 *
 * Also confirms the session hasn't been force-terminated (deleted from
 * LoginSession) — without this check, a valid JWT keeps working for its
 * full 7-day expiry regardless of a "force logout" action.
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

    const active = await isSessionActive(token);
    if (!active) {
      return {
        error: NextResponse.json(
          { message: "Session expired" },
          { status: 401 },
        ),
      };
    }

    return { user };
  } catch {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }
}

/**
 * Invalidate cache entry (call after force-logout or session termination).
 */
export function invalidateSessionCache(token?: string) {
  if (token) {
    sessionCache.delete(token);
  } else {
    sessionCache.clear();
  }
}
