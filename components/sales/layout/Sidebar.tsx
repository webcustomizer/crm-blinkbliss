"use client";

import Image from "next/image";
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
      <div
        className="
        relative
        shrink-0
        overflow-hidden
        border-b
        border-[#D4AF37]/20
        bg-gradient-to-b
        from-[#1c1c1c]
        to-[#161616]
        px-6
        py-7
        "
      >
        {/* Subtle glow accent */}
        <div
          className="
          pointer-events-none
          absolute
          -left-10
          -top-10
          h-32
          w-32
          rounded-full
          bg-[#D4AF37]/10
          blur-3xl
          "
        />

        <div className="relative flex items-center gap-3">
          <div
            className="
            relative
            flex
            h-12
            w-12
            shrink-0
            items-center
            justify-center
            rounded-2xl
            border
            border-[#D4AF37]/30
            bg-black/40
            p-1.5
            shadow-[0_0_20px_rgba(212,175,55,0.15)]
            "
          >
            <Image
              src="/logo.png"
              alt="Blink and Bliss"
              width={40}
              height={40}
              className="h-full w-full object-contain"
              priority
            />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-wide text-[#D4AF37]">
              BlinknBliss
            </h1>

            <p className="mt-0.5 truncate text-xs font-medium uppercase tracking-wider text-zinc-500">
              Salesperson Portal
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;

          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-4 py-3 transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-[#D4AF37] to-[#c9a430] text-black shadow-lg shadow-[#D4AF37]/20"
                  : "text-zinc-300 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-0 h-full w-1 bg-black/20" />
              )}

              <Icon
                size={20}
                className={`shrink-0 transition-transform duration-200 ${
                  active ? "" : "group-hover:scale-110"
                }`}
              />

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
          bg-gradient-to-br
          from-[#1f1f1f]
          to-[#171717]
          p-4
          shadow-inner
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
            bg-gradient-to-br
            from-[#D4AF37]
            to-[#b8912b]
            font-bold
            text-black
            shadow-[0_0_12px_rgba(212,175,55,0.35)]
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
          duration-200
          hover:bg-red-500/20
          active:scale-[0.98]
          "
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
