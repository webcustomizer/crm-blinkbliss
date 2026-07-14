"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar-context";

export default function Topbar() {
  const { toggle } = useSidebar();

  return (
    <header className="flex h-20 items-center justify-between border-b border-yellow-600/20 bg-[#181818] px-4 md:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          aria-label="Toggle menu"
          className="rounded-lg p-2 text-gray-300 hover:bg-[#252525] hover:text-[#D4AF37] md:hidden"
        >
          <Menu size={22} />
        </button>

        <div>
          <h2 className="text-2xl font-bold text-[#D4AF37]">Dashboard</h2>
          <p className="text-sm text-gray-400">Welcome back, Master Admin</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D4AF37] font-bold text-black">
          A
        </div>
      </div>
    </header>
  );
}
