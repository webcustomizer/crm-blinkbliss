import { Suspense } from "react";
import LeadsTable from "@/components/admin/leads/LeadTable";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const salespersons = await prisma.user.findMany({
    where: {
      role: "SALESPERSON",
      isActive: true,
    },

    select: {
      id: true,
      name: true,
    },

    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#D4AF37]">Leads</h1>

          <p className="text-gray-400">Manage all leads</p>
        </div>
      </div>

      <Suspense fallback={<div className="text-gray-400">Loading...</div>}>
        <LeadsTable salespersons={salespersons} />
      </Suspense>
    </div>
  );
}
