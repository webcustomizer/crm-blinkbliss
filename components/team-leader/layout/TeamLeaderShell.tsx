"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/team-leader/layout/Sidebar";
import Header from "@/components/team-leader/layout/Header";
import MobileBottomNav from "@/components/team-leader/layout/MobileBottomNav";
import MobileDrawer from "@/components/team-leader/layout/MobileDrawer";
import useSalesNotifications from "@/hooks/useSalesNotifications";
import { UnreadProvider } from "@/hooks/useUnreadCounts";
import { TeamLeaderSettingsProvider } from "@/hooks/useTeamLeaderSettings";
import type { TokenPayload } from "@/lib/auth";

interface TeamLeaderShellProps {
  children: React.ReactNode;
  user: TokenPayload | null;
}

export default function TeamLeaderShell({ children, user }: TeamLeaderShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const mainRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (!el) return;
        const y = el.scrollTop;
        if (y < 10) { setNavHidden(false); }
        else if (y > lastScrollY.current + 5) { setNavHidden(true); }
        else if (y < lastScrollY.current - 5) { setNavHidden(false); }
        lastScrollY.current = y;
        ticking = false;
      });
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setNavHidden(false); }, [pathname]);

  const headerTitle = (() => {
    if (pathname.startsWith("/team-leader/messages")) return "Messages";
    if (pathname.startsWith("/team-leader/group-chat")) return "Group Chat";
    if (pathname.startsWith("/team-leader/profile")) return "Profile";
    if (pathname.startsWith("/team-leader/leads")) return "My Leads";
    if (pathname.startsWith("/team-leader/team-leads")) return "Team Leads";
    if (pathname.startsWith("/team-leader/team")) return "My Team";
    if (pathname.startsWith("/team-leader/reports")) return "Reports";
    if (pathname.startsWith("/team-leader/announcements")) return "Announcements";
    return "Dashboard";
  })();

  const handleNewNotification = useCallback(() => {
    if (
      pathname.startsWith("/team-leader/messages") ||
      pathname.startsWith("/team-leader/group-chat") ||
      pathname.startsWith("/team-leader/leads") ||
      pathname.startsWith("/team-leader/team-leads")
    ) {
      return;
    }
    router.refresh();
  }, [router, pathname]);

  useSalesNotifications({
    userId: user?.id,
    onNewNotification: handleNewNotification,
  });

  return (
    <TeamLeaderSettingsProvider>
      <UnreadProvider userId={user?.id}>
        <div className="flex h-screen overflow-hidden bg-[#111111] text-white">
          <div className="flex min-w-0 flex-1">
            <aside className="hidden lg:block lg:w-72 lg:flex-shrink-0 lg:border-r lg:border-[#D4AF37]/20 lg:bg-[#161616]">
              <Sidebar />
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
              <div style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 8px)" }} className="bg-[#111111]">
                <Header title={headerTitle} user={user} onMenuClick={() => setMobileMenuOpen(true)} />
              </div>
              <main ref={mainRef} className="flex-1 overflow-y-auto bg-[#111111]" style={{ overscrollBehavior: "contain" }}>
                <div className="mx-auto w-full max-w-7xl px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:pb-8">
                  {children}
                </div>
              </main>
            </div>
          </div>

          <MobileDrawer
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />

          <div className="lg:hidden">
            <MobileBottomNav hidden={navHidden} />
          </div>
        </div>
      </UnreadProvider>
    </TeamLeaderSettingsProvider>
  );
}