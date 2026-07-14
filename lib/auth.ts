import { SignJWT, jwtVerify } from "jose";

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
