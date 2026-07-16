"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, User, Megaphone } from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/sales/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Leads",
    href: "/sales/my-leads",
    icon: Users,
  },
  {
    name: "Announcements",
    href: "/sales/announcements",
    icon: Megaphone,
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#D4AF37]/20 bg-[#161616]/95 backdrop-blur lg:hidden">
      <div className="grid h-16 grid-cols-3">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 transition ${
                active ? "text-[#D4AF37]" : "text-zinc-400 hover:text-[#D4AF37]"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />

              <span className="text-[11px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
