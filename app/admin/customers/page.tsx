import { Suspense } from "react";

import CustomersTable from "@/components/admin/customers/CustomersTable";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#D4AF37]">Customers</h1>

        <p className="text-gray-400">Manage joined customers</p>
      </div>

      <Suspense
        fallback={<div className="text-gray-400">Loading customers...</div>}
      >
        <CustomersTable />
      </Suspense>
    </div>
  );
}
