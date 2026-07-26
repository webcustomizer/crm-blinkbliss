"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { useSidebar } from "./sidebar-context";
import { handleAPIError } from "@/lib/client-error";

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
  { href: "/admin/trash", title: "Trash" },
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
  const router = useRouter();

  const [time, setTime] = useState("");
  const [adminName, setAdminName] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  const initials = adminName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-5 sm:py-3 md:px-6">
        <button
          onClick={() => setIsOpen(true)}
          className="md:hidden rounded-xl border border-white/10 bg-black/30 p-2 text-white/70 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-medium tracking-[0.15em] text-[#D4AF37]/70 uppercase hidden sm:block">
            Blink &amp; Bliss
          </span>
          <h1 className="text-sm sm:text-base font-semibold text-white truncate">
            {pageTitleFor(pathname)}
          </h1>
        </div>

        <div className="flex-1" />

        {time && (
          <span className="hidden md:inline text-xs font-medium text-white/40 tabular-nums">
            {time}
          </span>
        )}

        <div className="flex items-center gap-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-xs font-medium text-[#D4AF37] hidden sm:inline">
            Admin Panel
          </span>
        </div>

        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-2 py-1.5 transition-all hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/10"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-xs font-bold text-[#D4AF37]"
              title={adminName || "Admin"}
            >
              {initials || "A"}
            </div>
            <ChevronDown
              size={14}
              className={`hidden sm:block text-[#D4AF37]/60 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#141414] shadow-2xl shadow-black/50">
              <div className="border-b border-white/10 px-4 py-3">
                <p className="text-sm font-semibold text-white truncate">{adminName || "Admin"}</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>

              <div className="py-1.5">
                <button
                  onClick={() => { setDropdownOpen(false); router.push("/admin/profile"); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]"
                >
                  <User size={16} />
                  Profile
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); router.push("/admin/settings"); }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-[#D4AF37]/10 hover:text-[#D4AF37]"
                >
                  <Settings size={16} />
                  Settings
                </button>
              </div>

              <div className="border-t border-white/10 py-1.5">
                <button
                  onClick={async () => {
                    setDropdownOpen(false);
                    await fetch("/api/logout", { method: "POST" });
                    window.location.href = "/login";
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
