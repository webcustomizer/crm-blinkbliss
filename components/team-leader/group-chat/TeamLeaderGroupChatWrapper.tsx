"use client";

import { useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTeamLeaderSettings } from "@/hooks/useTeamLeaderSettings";
import { ShieldAlert } from "lucide-react";

const TeamLeaderGroupChatPanel = dynamic(
  () => import("@/components/team-leader/group-chat/TeamLeaderGroupChatPanel"),
  { ssr: false, loading: () => <div className="h-[70vh] animate-pulse rounded-2xl bg-white/[0.03]" /> },
);

export default function TeamLeaderGroupChatWrapper({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const { navItems } = useTeamLeaderSettings();
  const hasGroupChat = navItems.some((i) => i.href === "/team-leader/group-chat");
  const anchorRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useLayoutEffect(() => {
    function measure() {
      if (!anchorRef.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width });
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    const t = setTimeout(measure, 200);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      clearTimeout(t);
    };
  }, []);

  if (navItems.length > 0 && !hasGroupChat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#171717] to-[#0d0d0d] p-8 sm:p-12 max-w-md">
          <ShieldAlert size={40} className="mx-auto text-red-400/60 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Group Chat Disabled</h2>
          <p className="text-gray-400 text-sm">Group chat has been disabled by admin.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={anchorRef} />
      {rect ? (
        <div
          className="bottom-16 lg:bottom-6"
          style={{
            position: "fixed",
            top: rect.top,
            left: rect.left,
            width: rect.width,
          }}
        >
          <TeamLeaderGroupChatPanel currentUserId={currentUserId} />
        </div>
      ) : (
        <div className="h-[70vh]">
          <TeamLeaderGroupChatPanel currentUserId={currentUserId} />
        </div>
      )}
    </>
  );
}
