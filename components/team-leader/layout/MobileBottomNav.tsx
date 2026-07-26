"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Megaphone, MessageSquare } from "lucide-react";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { useTeamLeaderSettings } from "@/hooks/useTeamLeaderSettings";

export default function MobileBottomNav({ hidden }: { hidden?: boolean }) {
  const pathname = usePathname();
  const unread = useUnreadCounts();
  const { navItems, navLoaded } = useTeamLeaderSettings();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const effectiveHidden = mounted && hidden;

  const items = navLoaded
    ? navItems.filter((i) => i.href !== "/team-leader/profile").slice(0, 5)
    : [
        { title: "Home", href: "/team-leader/dashboard", icon: LayoutDashboard },
        { title: "Leads", href: "/team-leader/leads", icon: Users },
        { title: "Team", href: "/team-leader/team", icon: Users },
        { title: "Chat", href: "/team-leader/messages", icon: MessageSquare, badgeKey: "messages" as const },
        { title: "More", href: "/team-leader/announcements", icon: Megaphone, badgeKey: "announcements" as const },
      ];

  const gridCols = items.length === 3 ? "grid-cols-3" : items.length === 4 ? "grid-cols-4" : "grid-cols-5";

  return (
    <nav suppressHydrationWarning
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-[#D4AF37]/20 bg-[#161616]/95 backdrop-blur transition-transform duration-300 ease-in-out ${effectiveHidden ? "translate-y-full" : "translate-y-0"}`}
    >
      <div className={`grid h-16 gap-1 ${gridCols}`}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const badge = item.badgeKey ? unread[item.badgeKey] : 0;
          return (
            <Link key={item.href} href={item.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 transition ${active ? "text-[#D4AF37]" : "text-zinc-400 hover:text-[#D4AF37]"}`}>
              <div className="relative">
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                {badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
