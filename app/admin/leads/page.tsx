import LeadDialog from "@/components/admin/leads/LeadDialog";
import LeadsTable from "@/components/admin/leads/LeadTable";

import { prisma } from "@/lib/prisma";

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

      <LeadsTable salespersons={salespersons} />
    </div>
  );
}
