import { ReactNode } from "react";
import { redirect } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/admin/sidebar-context";
import { getActiveSession } from "@/lib/get-active-session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getActiveSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/api/force-logout");
  }

  return (
    <SidebarProvider>
      {/* h-screen + overflow-hidden = the whole app shell is pinned to the
          viewport. Nothing outside <main> can ever cause a page-level
          scrollbar anymore. */}
      <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
        <Sidebar />
        <div className="flex flex-1 flex-col min-w-0 h-screen overflow-hidden">
          <div style={{ paddingTop: "env(safe-area-inset-top)" }} className="bg-[#0a0a0a]">
            <Topbar />
          </div>
          {/* min-h-0 is required alongside flex-1 — without it, a flex child
              refuses to shrink below its content size, which is what was
              letting content stretch past the viewport and scroll the page.
              overflow-y-auto here makes <main> the one scroll container for
              every admin page (dashboard, leads, etc. keep scrolling exactly
              as before — this doesn't change their behavior). */}
          <main className="flex-1 min-h-0 p-3 sm:p-5 md:p-6 lg:p-8 pb-20 sm:pb-6 overflow-x-hidden overflow-y-auto">
            {children}
            <Toaster position="top-right" richColors />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
