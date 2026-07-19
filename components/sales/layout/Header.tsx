"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import Link from "next/link";

import type { TokenPayload } from "@/lib/auth";
import NotificationBell from "../notifications/NotificationBell";

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

  const userName = user?.name || "Salesperson";

  return (
    <header
      className="
      sticky
      top-0
      z-40
      border-b
      border-[#D4AF37]/20
      bg-[#111111]/95
      backdrop-blur
      "
    >
      <div
        className="
        flex
        min-h-20
        items-center
        justify-between
        gap-3
        px-3
        sm:px-4
        lg:px-8
        "
      >
        {/* Left */}

        <div className="flex min-w-0 items-center gap-3">
          {/* Mobile Menu */}

          <button
            onClick={onMenuClick}
            className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            border
            border-[#D4AF37]/20
            text-zinc-300
            transition
            hover:border-[#D4AF37]
            hover:text-[#D4AF37]
            lg:hidden
            "
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0">
            <p
              className="
              text-[10px]
              uppercase
              tracking-[0.18em]
              text-[#D4AF37]
              sm:text-xs
              "
            >
              {title}
            </p>

            <h1
              className="
              mt-1
              truncate
              text-base
              font-bold
              text-white
              sm:text-lg
              lg:text-xl
              "
            >
              {greeting}, {userName} 👋
            </h1>

            <p
              className="
              truncate
              text-xs
              text-zinc-400
              sm:text-sm
              "
            >
              {today}
            </p>
          </div>
        </div>

        {/* Right */}

        <div
          className="
          flex
          shrink-0
          items-center
          gap-2
          sm:gap-3
          "
        >
          {/* // Header.tsx mein */}
          <NotificationBell userId={user?.id ?? ""} />

          {/* Desktop User */}

          <div className="hidden text-right lg:block">
            <p className="text-sm font-semibold text-white">{userName}</p>
          </div>

          {/* Avatar - hidden on mobile, visible from lg breakpoint up */}

          <Link
            href="/sales/profile"
            className="
            hidden
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-[#D4AF37]
            font-semibold
            text-black
            transition
            hover:scale-105
            active:scale-95
            lg:flex
            "
          >
            {userName.charAt(0).toUpperCase()}
          </Link>
        </div>
      </div>
    </header>
  );
}
