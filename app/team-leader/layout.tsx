import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TeamLeaderShell from "@/components/team-leader/layout/TeamLeaderShell";
import { verifyToken, type TokenPayload } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import BackButtonHandler from "@/components/BackButtonHandler";
import PushNotificationSetup from "@/components/PushNotificationSetup";
import SessionGuard from "@/components/sales/layout/SessionGuard";

interface TeamLeaderLayoutProps {
  children: ReactNode;
}

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

  return (
    <TeamLeaderShell user={user}>
      <PushNotificationSetup />
      <SessionGuard userId={user.id} token={token!} />
      <BackButtonHandler />
      {children}
      <Toaster position="top-right" richColors />
    </TeamLeaderShell>
  );
}
