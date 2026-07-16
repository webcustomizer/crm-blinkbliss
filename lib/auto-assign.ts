import { prisma } from "@/lib/prisma";

/**
 * Agar automation ON hai, to active salespersons mein se
 * round-robin tareeqe se agla salesperson return karta hai
 * aur CRMSetting.lastAssignedSalespersonId ko usi waqt update kar deta hai.
 *
 * Agar automation OFF hai, ya koi active salesperson nahi hai,
 * to null return karta hai (lead unassigned rahegi).
 *
 * $transaction use kiya hai taake ek sath 2 leads create hon
 * (jaise CSV import + manual add) to round-robin pointer sahi rahe.
 */
export async function getNextAutoAssignee(): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    const settings = await tx.cRMSetting.findFirst();

    if (!settings || !settings.autoAssignEnabled) {
      return null;
    }

    const salespeople = await tx.user.findMany({
      where: { role: "SALESPERSON", isActive: true },
      select: { id: true },
      orderBy: { name: "asc" },
    });

    if (salespeople.length === 0) {
      return null;
    }

    let nextIndex = 0;
    if (settings.lastAssignedSalespersonId) {
      const lastIndex = salespeople.findIndex(
        (sp) => sp.id === settings.lastAssignedSalespersonId,
      );
      nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % salespeople.length;
    }

    const nextSalesperson = salespeople[nextIndex];

    await tx.cRMSetting.update({
      where: { id: settings.id },
      data: { lastAssignedSalespersonId: nextSalesperson.id },
    });

    return nextSalesperson.id;
  });
}
