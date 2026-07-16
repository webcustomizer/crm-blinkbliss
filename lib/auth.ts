import { SignJWT, jwtVerify } from "jose";
<<<<<<< HEAD
import { NextRequest } from "next/server";
=======
>>>>>>> 5e96d00d42fe7cff1606cae559d9204f95fff3e3

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
<<<<<<< HEAD

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
=======
>>>>>>> 5e96d00d42fe7cff1606cae559d9204f95fff3e3
