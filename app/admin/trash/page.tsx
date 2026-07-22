import { Suspense } from "react";
import TrashTable from "@/components/admin/trash/TrashTable";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#D4AF37]">Trash</h1>
        <p className="text-gray-400">Restore or permanently delete soft-deleted leads</p>
      </div>
      <Suspense fallback={<div className="text-gray-400">Loading trash…</div>}>
        <TrashTable />
      </Suspense>
    </div>
  );
}
