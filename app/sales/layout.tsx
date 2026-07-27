import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SalesShell from "@/components/sales/layout/SalesShell";
import SessionGuard from "@/components/sales/layout/SessionGuard";
import { verifyToken, type TokenPayload } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import BackButtonHandler from "@/components/BackButtonHandler";
import PushNotificationSetup from "@/components/PushNotificationSetup";

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

  if (!user) redirect("/login");
  if (user.role !== "SALESPERSON") redirect("/login");

  return (
    <SalesShell user={user}>
      <PushNotificationSetup />
      <SessionGuard userId={user.id} token={token!} />
      <BackButtonHandler />
      {children}
      <Toaster position="top-right" richColors />
    </SalesShell>
  );
}
