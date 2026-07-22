"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, LayoutDashboard, Users, Megaphone, User } from "lucide-react";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { useSalesSettings } from "@/hooks/useSalesSettings";

export default function Sidebar() {
  const pathname = usePathname();
  const unread = useUnreadCounts();
  const { navItems, navLoaded } = useSalesSettings();

  const items = navLoaded ? navItems : [
    { title: "Dashboard", href: "/sales/dashboard", icon: LayoutDashboard },
    { title: "My Leads", href: "/sales/my-leads", icon: Users },
    { title: "Announcements", href: "/sales/announcements", icon: Megaphone, badgeKey: "announcements" as const },
    { title: "Profile", href: "/sales/profile", icon: User },
  ];

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

return (
    <aside className="sticky top-0 z-[60] flex h-screen w-72 flex-col overflow-y-auto border-r border-[#D4AF37]/20 bg-[#161616]">
      <div className="relative shrink-0 overflow-hidden border-b border-[#D4AF37]/20 bg-gradient-to-b from-[#1c1c1c] to-[#161616] px-6 py-7">
        <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-[#D4AF37]/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-black/40 p-1.5 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
            <Image src="/logo.png" alt="Blink" width={40} height={40} className="h-full w-full object-contain" priority />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-wide text-[#D4AF37]">BlinknBliss</h1>
            <p className="mt-0.5 truncate text-xs font-medium uppercase tracking-wider text-zinc-500">Salesperson</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 p-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const badge = item.badgeKey ? unread[item.badgeKey] : 0;
          return (
            <Link key={item.href} href={item.href}
              className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-4 py-3 transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-[#D4AF37] to-[#c9a430] text-black shadow-lg shadow-[#D4AF37]/20"
                  : "text-zinc-300 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]"
              }`}>
              {active && <span className="absolute left-0 top-0 h-full w-1 bg-black/20" />}
              <Icon size={20} className={`shrink-0 transition-transform duration-200 ${active ? "" : "group-hover:scale-110"}`} />
              {item.title}
              {badge > 0 && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-[#D4AF37]/20 p-4">
        <button onClick={logout}
          className="group flex w-full items-center gap-3 overflow-hidden rounded-xl px-4 py-3 text-zinc-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400">
          <LogOut size={20} className="shrink-0 transition-transform group-hover:translate-x-1" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
