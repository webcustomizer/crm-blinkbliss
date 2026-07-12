import type { ReactNode } from "react";
import { cookies } from "next/headers";

import SalesShell from "@/components/sales/layout/SalesShell";

import { verifyToken, type TokenPayload } from "@/lib/auth";
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

  return (
    <SalesShell user={user}>
      {children}
      <Toaster position="top-right" richColors />
    </SalesShell>
  );
}
