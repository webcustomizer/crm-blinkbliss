import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import SalesShell from "@/components/sales/layout/SalesShell";
import SessionGuard from "@/components/sales/layout/SessionGuard";

import { verifyToken, type TokenPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Toaster } from "@/components/ui/sonner";

interface SalesLayoutProps {
  children: ReactNode;
}

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

  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, isActive: true, role: true },
  });

  if (!dbUser || !dbUser.isActive) {
    redirect("/api/force-logout");
  }

  return (
    <SalesShell user={user}>
      <SessionGuard userId={user.id} />
      {children}
      <Toaster position="top-right" richColors />
    </SalesShell>
  );
}
