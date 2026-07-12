export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";

import PageHeader from "@/components/admin/PageHeader";
import SalespersonTable from "@/components/admin/SalespersonTable";
import AddSalespersonDialog from "@/components/admin/AddSalespersonDialog";

export default async function SalespersonsPage() {
  const salespersons = await prisma.user.findMany({
    where: {
      role: "SALESPERSON",
    },

    orderBy: {
      createdAt: "desc",
    },

    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      createdAt: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Salespersons"
        description="Manage your sales team."
        action={<AddSalespersonDialog />}
      />

      <SalespersonTable salespersons={salespersons} />
    </>
  );
}
