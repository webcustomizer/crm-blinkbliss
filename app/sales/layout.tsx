import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SalesShell from "@/components/sales/layout/SalesShell";
import SessionGuard from "@/components/sales/layout/SessionGuard";
import { verifyToken, type TokenPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Toaster } from "@/components/ui/sonner";
import BackButtonHandler from "@/components/BackButtonHandler";

interface SalesLayoutProps {
  children: ReactNode;
}

export const dynamic = "force-dynamic";

export default async function SalesLayout({ children }: SalesLayoutProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  let user: TokenPayload | null = null;

  if (token) {
    try {
      user = await verifyToken(token);
    } catch {
      user = null;
    }
  }

  if (!user) redirect("/login");
  if (user.role !== "SALESPERSON") redirect("/login");

  // Streamlined: single query replaces the previous two parallel queries.
  // JWT is trustworthy (signed server-side) so we skip the dbUser role
  // check — we only need to verify isActive + session not terminated.
  const activeSession = await prisma.loginSession.findFirst({
    where: { token, isExpired: false },
    select: { id: true, user: { select: { isActive: true } } },
  });

  if (!activeSession || !activeSession.user?.isActive) redirect("/api/force-logout");

  return (
    <SalesShell user={user}>
      <SessionGuard userId={user.id} />
      <BackButtonHandler />
      {children}
      <Toaster position="top-right" richColors />
    </SalesShell>
  );
}
