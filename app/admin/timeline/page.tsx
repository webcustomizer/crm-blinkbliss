import { Suspense } from "react";
import Timeline from "@/components/admin/timeline/Timeline";

export const dynamic = "force-dynamic";

export default function TimelinePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#D4AF37]">Timeline</h1>
        <p className="text-gray-400">Comprehensive 360° activity view with filtering</p>
      </div>
      <Suspense fallback={<div className="text-zinc-400">Loading timeline...</div>}>
        <Timeline />
      </Suspense>
    </div>
  );
}
