/**
 * ONE-TIME maintenance script — run this BEFORE applying the new
 * `@@unique([phone])` migration on Lead, if your database might already
 * have duplicate phone numbers (likely, since there was no DB-level
 * constraint before).
 *
 * What it does:
 *  - Finds every phone number that appears on more than one Lead.
 *  - Keeps the OLDEST lead for that phone (first created).
 *  - Re-points any FollowUp / StatusHistory / ActivityLog rows from the
 *    newer duplicate(s) onto the kept lead, then deletes the duplicates.
 *
 * This is destructive (it deletes rows), so:
 *  1. Take a DB backup / snapshot first.
 *  2. Run with DRY_RUN=true first and read the printed report.
 *  3. Re-run with DRY_RUN=false to actually apply it.
 *
 * Usage:
 *   DRY_RUN=true  npx tsx prisma/maintenance/dedupe-lead-phones.ts
 *   DRY_RUN=false npx tsx prisma/maintenance/dedupe-lead-phones.ts
 */
import { prisma } from "../../lib/prisma";

const DRY_RUN = process.env.DRY_RUN !== "false";

async function main() {
  const duplicates = await prisma.lead.groupBy({
    by: ["phone"],
    _count: { _all: true },
    having: { phone: { _count: { gt: 1 } } },
  });

  if (duplicates.length === 0) {

    return;
  }



  for (const dup of duplicates) {
    const leads = await prisma.lead.findMany({
      where: { phone: dup.phone },
      orderBy: { createdAt: "asc" },
    });

    const [keep, ...remove] = leads;

    // [removed console.log]

    if (DRY_RUN) continue;

    for (const lead of remove) {
      await prisma.followUp.updateMany({
        where: { leadId: lead.id },
        data: { leadId: keep.id },
      });
      await prisma.statusHistory.updateMany({
        where: { leadId: lead.id },
        data: { leadId: keep.id },
      });
      await prisma.activityLog.updateMany({
        where: { leadId: lead.id },
        data: { leadId: keep.id },
      });
      await prisma.lead.delete({ where: { id: lead.id } });
    }
  }

// [removed]
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
