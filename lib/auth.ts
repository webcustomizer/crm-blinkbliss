import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export type TokenPayload = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SALESPERSON";
};

export async function createToken(payload: TokenPayload) {
  return await new SignJWT(payload)

    .setProtectedHeader({
      alg: "HS256",
    })

    .setIssuedAt()

    .setExpirationTime("7d")

    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, secret);

  if (
    typeof payload.id !== "string" ||
    typeof payload.name !== "string" ||
    typeof payload.email !== "string" ||
    (payload.role !== "ADMIN" && payload.role !== "SALESPERSON")
  ) {
    throw new Error("Invalid token payload");
  }

  return payload as unknown as TokenPayload;
}

export async function getTokenFromRequest(
  req: NextRequest,
): Promise<string | null> {
  // 1. Web client: httpOnly cookie
  const cookieToken = req.cookies.get("token")?.value;
  if (cookieToken) return cookieToken;

  // 2. Capacitor app: Authorization: Bearer <token>
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

// ─── Signed temp token for 2FA flow ───────────────────────────────
// Prevents forging arbitrary userIds to bypass 2FA.
// Token = base64(payload) + "." + hex(HMAC-SHA256)
// Expires after 5 minutes.

const TEMP_TOKEN_TTL_MS = 5 * 60 * 1000;

function hmacSign(data: string): string {
  return createHmac("sha256", process.env.JWT_SECRET!).update(data).digest("hex");
}

export function createTempToken(userId: string, email: string): string {
  const payload = JSON.stringify({ userId, email, iat: Date.now() });
  const b64 = Buffer.from(payload).toString("base64url");
  const sig = hmacSign(b64);
  return `${b64}.${sig}`;
}

export function verifyTempToken(
  tempToken: string,
): { valid: true; userId: string; email: string } | { valid: false; reason: string } {
  const dotIdx = tempToken.indexOf(".");
  if (dotIdx === -1) {
    // No signature present. tempToken must always be HMAC-signed — this
    // prevents forging arbitrary userIds to bypass 2FA.
    return { valid: false, reason: "Malformed token" };
  }

  const b64 = tempToken.slice(0, dotIdx);
  const sig = tempToken.slice(dotIdx + 1);

  // Verify HMAC
  const expected = hmacSign(b64);
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { valid: false, reason: "Invalid signature" };
    }
  } catch {
    return { valid: false, reason: "Invalid signature" };
  }

  let payload: { userId: string; email: string; iat: number };
  try {
    payload = JSON.parse(Buffer.from(b64, "base64url").toString());
  } catch {
    return { valid: false, reason: "Malformed payload" };
  }

  if (!payload.userId || !payload.email || !payload.iat) {
    return { valid: false, reason: "Missing fields" };
  }

  if (Date.now() - payload.iat > TEMP_TOKEN_TTL_MS) {
    return { valid: false, reason: "Token expired" };
  }

  return { valid: true, userId: payload.userId, email: payload.email };
}
