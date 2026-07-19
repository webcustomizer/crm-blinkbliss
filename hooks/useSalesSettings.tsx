"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
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

  const buildNav = useCallback((payload: { messageEnabled?: boolean; groupChatEnabled?: boolean }) => {
    const { LayoutDashboard, Users, Megaphone, MessageSquare, User } = require("lucide-react");
    const base: NavItem[] = [
      { title: "Dashboard", href: "/sales/dashboard", icon: LayoutDashboard },
      { title: "My Leads", href: "/sales/my-leads", icon: Users },
    ];
    if (payload.messageEnabled !== false) base.push({ title: "Messages", href: "/sales/messages", icon: MessageSquare, badgeKey: "messages" as const });
    if (payload.groupChatEnabled !== false) base.push({ title: "Group Chat", href: "/sales/group-chat", icon: MessageSquare, badgeKey: "groupChat" as const });
    base.push({ title: "Announcements", href: "/sales/announcements", icon: Megaphone, badgeKey: "announcements" as const });
    base.push({ title: "Profile", href: "/sales/profile", icon: User });
    return base;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/salesperson/settings", { cache: "no-store" });
        const json = await res.json();
        setNavItems(buildNav({
          messageEnabled: json.data?.messageEnabled,
          groupChatEnabled: json.data?.groupChatEnabled,
        }));
      } catch {
        setNavItems(buildNav({}));
      } finally {
        setNavLoaded(true);
      }
    })();

    const unsub = subscribeToSettingsChanges((payload) => {
      setNavItems(buildNav(payload));
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
