"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCog,
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
    <aside className="flex h-screen w-72 flex-col border-r border-yellow-600/20 bg-[#181818]">
      {/* Logo */}
      <div className="border-b border-yellow-600/20 p-6">
        <h1 className="text-3xl font-bold text-[#D4AF37]">Blink & Bliss</h1>

        <p className="mt-1 text-sm text-gray-400">CRM System</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;

          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                active
                  ? "bg-[#D4AF37] text-black"
                  : "text-gray-300 hover:bg-[#252525] hover:text-[#D4AF37]"
              }`}
            >
              <Icon size={20} />

              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-yellow-600/20 p-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-400 transition hover:bg-red-500/10"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </aside>
  );
}
