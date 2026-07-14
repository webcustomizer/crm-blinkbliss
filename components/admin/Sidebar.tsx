"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCog,
  UserRoundCheck,
  ChartColumn,
  Settings,
  LogOut,
  Activity,
  Megaphone,
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Leads",
    href: "/admin/leads",
    icon: Users,
  },
  {
    title: "Customers",
    href: "/admin/customers",
    icon: UserRoundCheck,
  },
  {
    title: "Salespersons",
    href: "/admin/salespersons",
    icon: UserCog,
  },
  {
    title: "Reports",
    href: "/admin/reports",
    icon: ChartColumn,
  },
  {
    title: "Announcements",
    href: "/admin/announcements",
    icon: Megaphone,
  },
  {
    title: "Activity",
    href: "/admin/activity",
    icon: Activity,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", {
      method: "POST",
    });

    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-yellow-600/20 bg-gradient-to-b from-[#1c1c1c] via-[#181818] to-[#141414] shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
      {/* Logo */}
      <div className="border-b border-yellow-600/20 p-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#1f1f1f] ring-1 ring-yellow-600/30 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
            <Image
              src="/logo.png"
              alt="Blink & Bliss Logo"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-wide text-[#D4AF37]">
              Blink & Bliss
            </h1>
            <p className="text-xs uppercase tracking-widest text-gray-500">
              CRM System
            </p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-1.5 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;

          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-[#D4AF37] to-[#c19b2e] text-black shadow-[0_4px_12px_rgba(212,175,55,0.3)]"
                  : "text-gray-300 hover:bg-[#252525] hover:text-[#D4AF37] hover:pl-5"
              }`}
            >
              <Icon
                size={20}
                className={`transition-transform duration-200 ${
                  active ? "" : "group-hover:scale-110"
                }`}
              />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-yellow-600/20 p-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 transition-all duration-200 hover:bg-red-500/10 hover:pl-5"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </aside>
  );
}
