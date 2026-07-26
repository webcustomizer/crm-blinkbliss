"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { LayoutDashboard, Users, Megaphone, MessageSquare, User, BarChart3 } from "lucide-react";
import { subscribeToSettingsChanges } from "@/lib/realtime";

type NavItem = { title: string; href: string; icon: any; badgeKey?: "messages" | "groupChat" | "announcements" };

type TeamLeaderSettingsCtx = {
  navItems: NavItem[];
  navLoaded: boolean;
};

const TeamLeaderSettingsContext = createContext<TeamLeaderSettingsCtx>({ navItems: [], navLoaded: false });

export function TeamLeaderSettingsProvider({ children }: { children: ReactNode }) {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [navLoaded, setNavLoaded] = useState(false);

  const buildNav = useCallback((payload: { messageEnabled?: boolean; tlMessageEnabled?: boolean; groupChatEnabled?: boolean; tlGroupChatEnabled?: boolean }) => {
    const base: NavItem[] = [
      { title: "Dashboard", href: "/team-leader/dashboard", icon: LayoutDashboard },
      { title: "My Leads", href: "/team-leader/leads", icon: Users },
      { title: "Team Leads", href: "/team-leader/team-leads", icon: Users },
      { title: "My Team", href: "/team-leader/team", icon: Users },
    ];
    if (payload.tlMessageEnabled !== false) base.push({ title: "Messages", href: "/team-leader/messages", icon: MessageSquare, badgeKey: "messages" as const });
    if (payload.tlGroupChatEnabled !== false) base.push({ title: "Group Chat", href: "/team-leader/group-chat", icon: MessageSquare, badgeKey: "groupChat" as const });
    base.push({ title: "Reports", href: "/team-leader/reports", icon: BarChart3 });
    base.push({ title: "Announcements", href: "/team-leader/announcements", icon: Megaphone, badgeKey: "announcements" as const });
    base.push({ title: "Profile", href: "/team-leader/profile", icon: User });
    return base;
  }, []);

  useEffect(() => {
    fetch("/api/team-leader/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setNavItems(buildNav(json.data));
          setNavLoaded(true);
        }
      })
      .catch(() => setNavLoaded(true));

    const unsub = subscribeToSettingsChanges((payload) => {
      setNavItems(buildNav(payload));
      setNavLoaded(true);
    });
    return () => unsub();
  }, [buildNav]);

  return (
    <TeamLeaderSettingsContext.Provider value={{ navItems, navLoaded }}>
      {children}
    </TeamLeaderSettingsContext.Provider>
  );
}

export function useTeamLeaderSettings() {
  return useContext(TeamLeaderSettingsContext);
}