import "server-only";
import { cookies } from "next/headers";
import { verifyToken, TokenPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Server Component only. Confirms the JWT is valid AND the underlying
 * LoginSession row still exists (i.e. hasn't been force-terminated).
 * Returns null if either check fails.
 */
export async function getActiveSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  try {
    const user = await verifyToken(token);

    const session = await prisma.loginSession.findFirst({
      where: { token, isExpired: false },
      select: { id: true },
    });

    if (!session) return null;
    return user;
  } catch {
    return null;
  }
}
