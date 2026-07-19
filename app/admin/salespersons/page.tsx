import { Suspense } from "react";
import SalespersonTable from "@/components/admin/SalespersonTable";

export const dynamic = "force-dynamic";

export default function SalespersonsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#D4AF37]">Sales Team</h1>
        <p className="text-gray-400">Manage sales team, targets, and performance</p>
      </div>
      <Suspense fallback={<div className="text-gray-400">Loading team…</div>}>
        <SalespersonTable />
      </Suspense>
    </div>
  );
}
