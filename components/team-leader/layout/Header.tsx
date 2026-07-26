"use client";

import { useState, useEffect } from "react";
import { Menu, Crown } from "lucide-react";
import Link from "next/link";

import type { TokenPayload } from "@/lib/auth";
import NotificationBell from "@/components/sales/notifications/NotificationBell";

interface HeaderProps {
  title?: string;
  user?: TokenPayload | null;
  onMenuClick?: () => void;
}

export default function Header({
  title = "Dashboard",
  user,
  onMenuClick,
}: HeaderProps) {
  const [greeting, setGreeting] = useState("");
  const [today, setToday] = useState("");
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening");
    setToday(new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date()));
  }, []);

  const userName = user?.name || "Team Leader";

  return (
    <header className="sticky top-0 z-40 border-b border-[#D4AF37]/20 bg-[#111111]/95 backdrop-blur">
      <div className="flex min-h-20 items-center justify-between gap-3 px-3 sm:px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onMenuClick} aria-label="Open menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/20 text-zinc-300 transition hover:border-[#D4AF37] hover:text-[#D4AF37] lg:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#D4AF37] sm:text-xs">{title}</p>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="truncate text-base font-bold text-white sm:text-lg lg:text-xl">
                {greeting}, {userName}
              </h1>
              <span className="group relative inline-flex shrink-0">
                <button
                  onClick={() => setShowBadge((v) => !v)}
                  className="inline-flex shrink-0"
                >
                  <Crown size={18} className="text-blue-400 transition-colors group-hover:text-blue-300" />
                </button>
                <span className={`
                  pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap
                  rounded-lg border border-blue-500/20 bg-[#111111] px-3 py-1.5 text-[10px] font-semibold tracking-wide text-blue-400
                  shadow-lg shadow-black/40
                  transition-all duration-200
                  ${showBadge ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}
                  lg:group-hover:opacity-100 lg:group-hover:translate-y-0
                `}>
                  Team Leader
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-[#111111]" />
                </span>
              </span>
            </div>
            <p className="truncate text-xs text-zinc-400 sm:text-sm">{today}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <NotificationBell userId={user?.id ?? ""} />

          <div className="hidden text-right lg:block">
            <p className="text-sm font-semibold text-white">{userName}</p>
          </div>

          <Link href="/team-leader/profile"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] font-semibold text-black transition hover:scale-105 active:scale-95 lg:flex"
          >
            {userName.charAt(0).toUpperCase()}
          </Link>
        </div>
      </div>
    </header>
  );
}