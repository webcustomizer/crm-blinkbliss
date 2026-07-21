"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar-context";
import { handleAPIError } from "@/lib/client-error";

// Mirrors Sidebar.tsx's menuItems — kept separate/lightweight here since
// Topbar only needs the title, not the icon or badge key.
const PAGE_TITLES: { href: string; title: string }[] = [
  { href: "/admin/dashboard", title: "Dashboard" },
  { href: "/admin/leads", title: "Leads" },
  { href: "/admin/customers", title: "Customers" },
  { href: "/admin/salespersons", title: "Salespersons" },
  { href: "/admin/reports", title: "Reports" },
  { href: "/admin/messages", title: "Messages" },
  { href: "/admin/announcements", title: "Announcements" },
  { href: "/admin/group-chat", title: "Group Chat" },
  { href: "/admin/activity", title: "Activity" },
  { href: "/admin/sessions", title: "Sessions" },
  { href: "/admin/settings", title: "Settings" },
];

function pageTitleFor(pathname: string): string {
  const match = PAGE_TITLES.find((p) => pathname.startsWith(p.href));
  return match?.title ?? "Dashboard";
}

export default function Topbar() {
  const { setIsOpen } = useSidebar();
  const pathname = usePathname();

  const [time, setTime] = useState("");
  const [adminName, setAdminName] = useState("");

  // Client-only clock — starts empty so server/client render the same
  // thing on first paint, then fills in after mount (same pattern as
  // components/sales/layout/Header.tsx).
  useEffect(() => {
    const tick = () =>
      setTime(
        new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date()),
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json?.user?.name) setAdminName(json.user.name);
      })
      .catch((e) => handleAPIError(e, "Failed to load admin profile"));
    return () => {
      cancelled = true;
    };
  }, []);

  const initials = adminName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
      {/* Hairline gold gradient — the one accent this bar gets */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-5 sm:py-3 md:px-6">
        {/* Mobile hamburger */}
        <button
          onClick={() => setIsOpen(true)}
          className="md:hidden rounded-xl border border-white/10 bg-black/30 p-2 text-white/70 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Page context */}
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-medium tracking-[0.15em] text-[#D4AF37]/70 uppercase hidden sm:block">
            Blink &amp; Bliss
          </span>
          <h1 className="text-sm sm:text-base font-semibold text-white truncate">
            {pageTitleFor(pathname)}
          </h1>
        </div>

        <div className="flex-1" />

        {/* Clock — quiet, desktop only */}
        {time && (
          <span className="hidden md:inline text-xs font-medium text-white/40 tabular-nums">
            {time}
          </span>
        )}

        {/* Admin badge */}
        <div className="flex items-center gap-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-xs font-medium text-[#D4AF37] hidden sm:inline">
            Admin Panel
          </span>
        </div>

        {/* Admin avatar / initials */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-xs font-bold text-[#D4AF37]"
          title={adminName || "Admin"}
        >
          {initials || "A"}
        </div>
      </div>
    </header>
  );
}
