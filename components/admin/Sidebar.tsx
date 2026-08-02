"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, UserCog, UserRoundCheck,
  ChartColumn, Settings, LogOut, Activity, Megaphone,
  X, MessageSquare, Shield, Trash2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useSidebar } from "./sidebar-context";
import { supabase } from "@/lib/supabase";
import { prefetchRoute } from "@/lib/prefetch";

const now = new Date();
const month = now.getMonth() + 1;
const year = now.getFullYear();

const menuItems = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, prefetch: ["/api/admin/dashboard/stats"] },
  { title: "Leads", href: "/admin/leads", icon: Users, prefetch: ["/api/admin/leads?page=1&limit=10&search=&filter=ALL&salespersonId=&source="] },
  { title: "Customers", href: "/admin/customers", icon: UserRoundCheck, prefetch: ["/api/admin/customers?page=1&limit=20&search="] },
  { title: "Salespersons", href: "/admin/salespersons", icon: UserCog, prefetch: [`/api/admin/targets?month=${month}&year=${year}`] },
  { title: "Reports", href: "/admin/reports", icon: ChartColumn, prefetch: ["/api/admin/reports/stats?filter=ALL", "/api/admin/analytics/funnel", "/api/admin/reports/team-performance?filter=ALL"] },
  { title: "Messages", href: "/admin/messages", icon: MessageSquare, badgeKey: "messages" as const, prefetch: ["/api/admin/messages/contacts", "/api/admin/messages/unread-per-user"] },
  { title: "Announcements", href: "/admin/announcements", icon: Megaphone, prefetch: ["/api/admin/announcements"] },
  { title: "Group Chat", href: "/admin/group-chat", icon: MessageSquare, badgeKey: "groupChat" as const, prefetch: ["/api/admin/group-chat?conversations=true&chatType=TL_TEAM"] },
  { title: "Activity", href: "/admin/activity", icon: Activity, prefetch: ["/api/admin/activity"] },
  { title: "Trash", href: "/admin/trash", icon: Trash2, prefetch: ["/api/admin/leads/soft-delete?page=1&limit=20&search="] },
  { title: "Sessions", href: "/admin/sessions", icon: Shield, prefetch: ["/api/admin/sessions?all=true"] },
  { title: "Settings", href: "/admin/settings", icon: Settings, prefetch: ["/api/admin/settings"] },
];

const COLLAPSE_KEY = "admin-sidebar-collapsed";

export default function Sidebar() {
  const pathname = usePathname();
  const { isOpen, setIsOpen } = useSidebar();
  const [unreadCounts, setUnreadCounts] = useState<{ messages: number; groupChat: number }>({ messages: 0, groupChat: 0 });
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/unread-count", { cache: "no-store" });
      const j = await r.json();
      if (j.success) setUnreadCounts(j.data);
    } catch (e) { console.error("Failed to load unread count:", e); }
  }, []);

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchUnread, 500);
  }, [fetchUnread]);

  // Load collapsed preference (client-only, avoids hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem(COLLAPSE_KEY);
    if (saved === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });
  }, []);

  useEffect(() => { setIsOpen(false); }, [pathname, setIsOpen]);
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);
  useEffect(() => {
    fetchUnread();

    const channel = supabase
      .channel("admin-unread-count-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Message" }, () => debouncedFetch())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "Message" }, () => debouncedFetch())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "GroupMessage" }, () => debouncedFetch())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "GroupReadReceipt" }, () => debouncedFetch())
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchUnread, debouncedFetch]);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      {isOpen && (
        <div onClick={() => setIsOpen(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col border-r border-yellow-600/20 bg-gradient-to-b from-[#1c1c1c] via-[#181818] to-[#141414] shadow-[4px_0_24px_rgba(0,0,0,0.4)] transition-all duration-300 ease-in-out md:static ${
          mounted ? (collapsed ? "md:w-20" : "md:w-72") : "md:w-72"
        } ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="relative border-b border-yellow-600/20 p-6">
          <div className={`flex items-center gap-3 ${collapsed ? "md:justify-center" : ""}`}>
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1f1f1f] ring-1 ring-yellow-600/30 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
              <Image src="/logo.png" alt="Blink & Bliss Logo" width={36} height={36} className="object-contain" priority />
            </div>
            <div className={`overflow-hidden transition-all duration-300 ${collapsed ? "md:w-0 md:opacity-0" : "w-auto opacity-100"}`}>
              <h1 className="whitespace-nowrap text-2xl font-bold tracking-wide text-[#D4AF37]">Blink & Bliss</h1>
              <p className="whitespace-nowrap text-xs uppercase tracking-widest text-gray-500">CRM System</p>
            </div>
          </div>

          {/* Mobile close button */}
          <button onClick={() => setIsOpen(false)} aria-label="Close menu" className="absolute right-3 top-3 rounded-lg p-2 text-gray-300 hover:bg-[#252525] hover:text-[#D4AF37] md:hidden">
            <X size={22} />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute -right-3 top-8 hidden h-6 w-6 items-center justify-center rounded-full border border-yellow-600/30 bg-[#1f1f1f] text-[#D4AF37] shadow-md hover:bg-[#252525] md:flex"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const badge = item.badgeKey ? unreadCounts[item.badgeKey] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.title : undefined}
                onMouseEnter={() => item.prefetch?.forEach(prefetchRoute)}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  collapsed ? "md:justify-center md:px-0" : ""
                } ${
                  active
                    ? "bg-gradient-to-r from-[#D4AF37] to-[#c19b2e] text-black shadow-[0_4px_12px_rgba(212,175,55,0.3)]"
                    : "text-gray-300 hover:bg-[#252525] hover:text-[#D4AF37] hover:pl-5"
                } ${collapsed ? "md:hover:pl-0" : ""}`}
              >
                <span className="relative shrink-0">
                  <Icon size={20} className={`transition-transform duration-200 ${active ? "" : "group-hover:scale-110"}`} />
                  {collapsed && badge > 0 && (
                    <span className="absolute -right-1 -top-1 hidden h-2.5 w-2.5 rounded-full bg-red-500 md:block" />
                  )}
                </span>

                <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "md:hidden" : ""}`}>
                  {item.title}
                </span>

                {badge > 0 && (
                  <span className={`ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white ${collapsed ? "md:hidden" : ""}`}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-yellow-600/20 p-4">
          <button
            onClick={logout}
            title={collapsed ? "Logout" : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 transition-all duration-200 hover:bg-red-500/10 hover:pl-5 ${
              collapsed ? "md:justify-center md:px-0 md:hover:pl-0" : ""
            }`}
          >
            <LogOut size={20} className="shrink-0" />
            <span className={collapsed ? "md:hidden" : ""}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}