import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TeamLeaderShell from "@/components/team-leader/layout/TeamLeaderShell";
import { verifyToken, type TokenPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Toaster } from "@/components/ui/sonner";
import BackButtonHandler from "@/components/BackButtonHandler";
import PushNotificationSetup from "@/components/PushNotificationSetup";
import SessionGuard from "@/components/sales/layout/SessionGuard";

interface TeamLeaderLayoutProps {
  children: ReactNode;
}

export const dynamic = "force-dynamic";

export default async function TeamLeaderLayout({ children }: TeamLeaderLayoutProps) {
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
  if (user.role !== "TEAM_LEAD") redirect("/login");

  const activeSession = await prisma.loginSession.findFirst({
    where: { token, isExpired: false },
    select: { id: true, user: { select: { isActive: true } } },
  });

  if (!activeSession || !activeSession.user?.isActive) redirect("/api/force-logout");

  return (
    <TeamLeaderShell user={user}>
      <PushNotificationSetup />
      <SessionGuard userId={user.id} />
      <BackButtonHandler />
      {children}
      <Toaster position="top-right" richColors />
    </TeamLeaderShell>
  );
}