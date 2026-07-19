import { Suspense } from "react";
import SessionsPanel from "@/components/admin/sessions/SessionsPanel";

export const dynamic = "force-dynamic";

export default function SessionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#D4AF37]">Active Sessions</h1>
        <p className="text-gray-400">Manage your active login sessions and devices</p>
      </div>
      <Suspense fallback={<div className="text-gray-400">Loading sessions…</div>}>
        <SessionsPanel />
      </Suspense>
    </div>
  );
}
