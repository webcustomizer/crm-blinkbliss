"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { LayoutDashboard, Users, Megaphone, MessageSquare, User } from "lucide-react";
import { subscribeToSettingsChanges } from "@/lib/realtime";

type NavItem = { title: string; href: string; icon: any; badgeKey?: "messages" | "groupChat" | "announcements" };

type SalesSettingsCtx = {
  navItems: NavItem[];
  navLoaded: boolean;
};

const SalesSettingsContext = createContext<SalesSettingsCtx>({ navItems: [], navLoaded: false });

export function SalesSettingsProvider({ children }: { children: ReactNode }) {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [navLoaded, setNavLoaded] = useState(false);
  const hasTeamLeaderRef = useRef(false);

  const settingsRef = useRef({ messageEnabled: true, tlMessageEnabled: true, groupChatEnabled: true, tlGroupChatEnabled: true, hasTeamLeader: false });

  const buildNav = useCallback((payload: { messageEnabled?: boolean; tlMessageEnabled?: boolean; groupChatEnabled?: boolean; tlGroupChatEnabled?: boolean; hasTeamLeader?: boolean }) => {
    const base: NavItem[] = [
      { title: "Dashboard", href: "/sales/dashboard", icon: LayoutDashboard },
      { title: "My Leads", href: "/sales/my-leads", icon: Users },
    ];
    const msgEnabled = payload.hasTeamLeader ? payload.tlMessageEnabled !== false : payload.messageEnabled !== false;
    if (msgEnabled) base.push({ title: "Messages", href: "/sales/messages", icon: MessageSquare, badgeKey: "messages" as const });
    const gcEnabled = payload.hasTeamLeader ? payload.tlGroupChatEnabled !== false : payload.groupChatEnabled !== false;
    if (gcEnabled) base.push({ title: "Group Chat", href: "/sales/group-chat", icon: MessageSquare, badgeKey: "groupChat" as const });
    base.push({ title: "Announcements", href: "/sales/announcements", icon: Megaphone, badgeKey: "announcements" as const });
    base.push({ title: "Profile", href: "/sales/profile", icon: User });
    return base;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/salesperson/settings", { cache: "no-store" });
        const json = await res.json();
        hasTeamLeaderRef.current = !!json.data?.hasTeamLeader;
        settingsRef.current = {
          messageEnabled: json.data?.messageEnabled ?? true,
          tlMessageEnabled: json.data?.tlMessageEnabled ?? true,
          groupChatEnabled: json.data?.groupChatEnabled ?? true,
          tlGroupChatEnabled: json.data?.tlGroupChatEnabled ?? true,
          hasTeamLeader: json.data?.hasTeamLeader ?? false,
        };
        setNavItems(buildNav(settingsRef.current));
      } catch {
        setNavItems(buildNav({}));
      } finally {
        setNavLoaded(true);
      }
    })();

    const unsub = subscribeToSettingsChanges((payload) => {
      settingsRef.current = { ...settingsRef.current, ...payload, hasTeamLeader: hasTeamLeaderRef.current };
      setNavItems(buildNav(settingsRef.current));
    });
    return () => unsub();
  }, [buildNav]);

  return (
    <SalesSettingsContext.Provider value={{ navItems, navLoaded }}>
      {children}
    </SalesSettingsContext.Provider>
  );
}

export function useSalesSettings() {
  return useContext(SalesSettingsContext);
}
