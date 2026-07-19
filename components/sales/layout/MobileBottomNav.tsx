"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { useSalesSettings } from "@/hooks/useSalesSettings";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const unread = useUnreadCounts();
  const allItems = useSalesSettings().navItems;
  const navItems = allItems.filter((item) => item.href !== "/sales/profile");

  const gridCols = navItems.length <= 3 ? "grid-cols-3" : navItems.length <= 4 ? "grid-cols-4" : "grid-cols-5";

  return (
    <nav style={{ paddingBottom: "env(safe-area-inset-bottom)" }} className="fixed inset-x-0 bottom-0 z-50 border-t border-[#D4AF37]/20 bg-[#161616]/95 backdrop-blur lg:hidden">
      <div className={`grid h-16 gap-1 ${gridCols}`}>
        {navItems.map((item) => {
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
