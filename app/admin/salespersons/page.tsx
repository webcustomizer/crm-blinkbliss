import { Suspense } from "react";
import SalespersonTable from "@/components/admin/SalespersonTable";

export const dynamic = "force-dynamic";

export default function SalespersonsPage() {
  return (
    <div className="space-y-8">
      <Suspense fallback={<div className="text-gray-400">Loading team…</div>}>
        <SalespersonTable />
      </Suspense>
    </div>
  );
}
