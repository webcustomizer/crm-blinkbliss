"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/sales/layout/Sidebar";
import Header from "@/components/sales/layout/Header";
import MobileBottomNav from "@/components/sales/layout/MobileBottomNav";
import MobileDrawer from "@/components/sales/layout/MobileDrawer";

import useSalesNotifications from "@/hooks/useSalesNotifications";

import type { TokenPayload } from "@/lib/auth";

interface SalesShellProps {
  children: React.ReactNode;
  user: TokenPayload | null;
}

export default function SalesShell({ children, user }: SalesShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const router = useRouter();

  const handleNewNotification = useCallback(() => {
    console.log("Refreshing salesperson dashboard");
    router.refresh();
  }, [router]);

  useSalesNotifications({
    userId: user?.id,
    onNewNotification: handleNewNotification,
  });

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:w-72 lg:flex-shrink-0 lg:border-r lg:border-[#D4AF37]/20 lg:bg-[#161616]">
          <Sidebar user={user} />
        </aside>

        {/* Main Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header user={user} onMenuClick={() => setMobileMenuOpen(true)} />

          <main className="flex-1 overflow-y-auto bg-[#111111]">
            <div className="mx-auto w-full max-w-7xl px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:pb-8">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Drawer */}

      <MobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
      />

      {/* Mobile Bottom Navigation */}

      <div className="lg:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}
