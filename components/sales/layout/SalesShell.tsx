"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/sales/layout/Sidebar";
import Header from "@/components/sales/layout/Header";
import MobileBottomNav from "@/components/sales/layout/MobileBottomNav";
import MobileDrawer from "@/components/sales/layout/MobileDrawer";
import useSalesNotifications from "@/hooks/useSalesNotifications";
import { UnreadProvider } from "@/hooks/useUnreadCounts";
import { SalesSettingsProvider } from "@/hooks/useSalesSettings";
import type { TokenPayload } from "@/lib/auth";

interface SalesShellProps {
  children: React.ReactNode;
  user: TokenPayload | null;
}

export default function SalesShell({ children, user }: SalesShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleNewNotification = useCallback(() => {
    if (
      pathname.startsWith("/sales/messages") ||
      pathname.startsWith("/sales/group-chat")
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
    <SalesSettingsProvider>
      <UnreadProvider>
        <div className="min-h-screen bg-[#111111] text-white">
          <div className="flex min-h-screen">
            <aside className="hidden lg:block lg:w-72 lg:flex-shrink-0 lg:border-r lg:border-[#D4AF37]/20 lg:bg-[#161616]">
              <Sidebar />
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
              <Header user={user} onMenuClick={() => setMobileMenuOpen(true)} />
              <main className="flex-1 pb-20 sm:pb-6 overflow-y-auto bg-[#111111]" style={{ overscrollBehavior: "contain" }}>
                <div className="mx-auto w-full max-w-7xl px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:pb-8">
                  {children}
                </div>
              </main>
            </div>
          </div>

          {mobileMenuOpen && (
            <MobileDrawer
              open={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
              user={user}
            />
          )}

          <div className="lg:hidden">
            <MobileBottomNav />
          </div>
        </div>
      </UnreadProvider>
    </SalesSettingsProvider>
  );
}
