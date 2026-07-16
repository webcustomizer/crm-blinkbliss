"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";

import Sidebar from "./Sidebar";
import type { TokenPayload } from "@/lib/auth";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  user: TokenPayload | null;
}

export default function MobileDrawer({
  open,
  onClose,
  user,
}: MobileDrawerProps) {
  const pathname = usePathname();

  // Close drawer after route change
  useEffect(() => {
    onClose();
  }, [pathname]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="
        fixed
        inset-0
        z-40
        bg-black/70
        lg:hidden
        "
      />

      {/* Drawer */}
      <div
        className="
        fixed
        left-0
        top-0
        z-50
        h-full
        w-72
        lg:hidden
        "
      >
        <div className="relative h-full">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="
            absolute
            right-3
            top-3
            z-10
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-lg
            border
            border-[#D4AF37]/20
            bg-[#161616]
            text-[#D4AF37]
            "
          >
            <X size={20} />
          </button>

          <Sidebar user={user} />
        </div>
      </div>
    </>
  );
}
