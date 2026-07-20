"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X, LogOut } from "lucide-react";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { useSalesSettings } from "@/hooks/useSalesSettings";

export default function MobileDrawer({ open, onClose, user }: { open: boolean; onClose: () => void; user?: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const unread = useUnreadCounts();
  const { navItems } = useSalesSettings();

  const items = [
    ...navItems,
    ...(navItems.some(i => i.href === "/sales/profile") ? [] : [
      { title: "Profile", href: "/sales/profile", icon: require("lucide-react").User },
    ]),
  ];

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={onClose} />
      <div className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#161616] border-r border-[#D4AF37]/20 transform transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 8px)" }} className="flex items-center justify-between p-4 border-b border-white/10">
          <span className="text-lg font-bold text-[#D4AF37]">Menu</span>
          <button onClick={onClose} className="p-2 rounded-lg text-white/60 hover:text-white"><X size={20} /></button>
        </div>
        <nav className="flex flex-col h-[calc(100%-64px-max(env(safe-area-inset-top,0px),8px))]">
          <div className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            {items.map(item => {
              const Icon = item.icon;
              const active = pathname === item.href;
              const badge = item.badgeKey ? unread[item.badgeKey] : 0;
              return (
                <Link key={item.href} href={item.href} onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${active ? "bg-[#D4AF37] text-black font-medium" : "text-zinc-300 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]"}`}>
                  <Icon size={18} />{item.title}
                  {badge > 0 && (
                    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-white/10 p-4 pb-[calc(env(safe-area-inset-bottom,0px)+68px)] sm:pb-4">
            <button onClick={logout} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-red-400 hover:bg-red-500/10">
              <LogOut size={18} /><span>Logout</span>
            </button>
          </div>
        </nav>
      </div>
    </>
  );
}
