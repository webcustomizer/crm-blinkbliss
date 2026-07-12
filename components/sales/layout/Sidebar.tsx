"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, User, LogOut, Megaphone } from "lucide-react";

import type { TokenPayload } from "@/lib/auth";

const menuItems = [
  {
    title: "Dashboard",
    href: "/sales/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "My Leads",
    href: "/sales/my-leads",
    icon: Users,
  },
  {
    title: "Announcements",
    href: "/sales/announcements",
    icon: Megaphone,
  },
  {
    title: "Profile",
    href: "/sales/profile",
    icon: User,
  },
];

interface SidebarProps {
  user: TokenPayload | null;
}

export default function Sidebar({ user }: SidebarProps) {
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
    <aside
      className="
      sticky
      top-0
      z-[60]
      flex
      h-screen
      w-72
      flex-col
      overflow-y-auto
      border-r
      border-[#D4AF37]/20
      bg-[#161616]
      "
    >
      {/* Logo */}
      <div className="shrink-0 border-b border-[#D4AF37]/20 px-6 py-7">
        <h1 className="text-2xl font-bold tracking-wide text-[#D4AF37]">
          BlinknBliss
        </h1>

        <p className="mt-1 text-sm text-zinc-400">Salesperson Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;

          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
                active
                  ? "bg-[#D4AF37] text-black shadow-lg"
                  : "text-zinc-300 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]"
              }`}
            >
              <Icon size={20} />

              <span className="font-medium">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="
        sticky
        bottom-0
        shrink-0
        border-t
        border-[#D4AF37]/20
        bg-[#161616]
        p-4
        pb-20
        lg:pb-4
        "
      >
        <div
          className="
          mb-4
          flex
          items-center
          gap-3
          rounded-xl
          border
          border-[#D4AF37]/20
          bg-[#1B1B1B]
          p-4
          "
        >
          {/* Avatar */}
          <div
            className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-[#D4AF37]
            font-bold
            text-black
            "
          >
            {user?.name?.charAt(0).toUpperCase() || "S"}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {user?.name || "Salesperson"}
            </p>

            <p className="truncate text-xs text-zinc-400">
              {user?.email || "No email"}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="
          flex
          w-full
          items-center
          justify-center
          gap-2
          rounded-xl
          border
          border-red-500/30
          bg-red-500/10
          px-4
          py-3
          text-sm
          font-medium
          text-red-400
          transition
          hover:bg-red-500/20
          "
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
