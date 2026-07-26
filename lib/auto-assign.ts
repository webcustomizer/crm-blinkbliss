import { prisma } from "@/lib/prisma";

/**
 * Block-distribution auto-assign based on automationMode:
 *
 * DISABLED          → returns null (no auto-assign)
 * TL_WEIGHTED       → picks a TL (block), returns TL's id
 * TL_TEAM_AUTO      → picks a TL (block), then picks a SP within that team (block), returns SP's id
 * DIRECT_WEIGHTED   → picks any eligible person (block), returns their id
 *
 * Block distribution: weight = number of consecutive leads.
 * Example: TL-A weight=5, TL-B weight=3, TL-C weight=2
 *   → Leads 1-5: TL-A, Leads 6-8: TL-B, Leads 9-10: TL-C, then repeat.
 *
 * Uses $transaction so concurrent CSV imports serialize correctly.
 */
export async function getNextAutoAssignee(): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    const settings = await tx.cRMSetting.findFirst();
    if (!settings || !settings.autoAssignEnabled) return null;

    const mode = settings.automationMode || "DISABLED";
    if (mode === "DISABLED") return null;

    const weights = (settings.automationWeights as Record<string, number>) || {};
    // Handle both old format (Record<string,number>) and new format (number)
    const raw = settings.automationCurrentWeights;
    const counter = typeof raw === "number" ? raw : 0;

    if (mode === "TL_WEIGHTED" || mode === "TL_TEAM_AUTO") {
      return pickFromWeightedPool(tx, weights, counter, ["TEAM_LEAD"], settings.id, mode === "TL_TEAM_AUTO" ? true : false);
    }

    if (mode === "DIRECT_WEIGHTED") {
      return pickFromWeightedPool(tx, weights, counter, ["SALESPERSON", "TEAM_LEAD"], settings.id, false);
    }

    return null;
  });
}

async function pickFromWeightedPool(
  tx: any,
  weights: Record<string, number>,
  counter: number,
  allowedRoles: string[],
  settingsId: string,
  teamAuto: boolean,
): Promise<string | null> {
  const candidates = await tx.user.findMany({
    where: { role: { in: allowedRoles }, isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  if (candidates.length === 0) return null;

  // Assign weight to each candidate: custom weight from settings, or default 1
  const weightedCandidates = candidates.map((c: any) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    weight: Math.max(weights[c.id] || 1, 1),
  }));

  // Build the block cycle: [A, A, A, A, A, B, B, B, C, C] for weights 5,3,2
  const cycle: string[] = [];
  weightedCandidates.forEach((c: any) => {
    for (let i = 0; i < c.weight; i++) {
      cycle.push(c.id);
    }
  });

  if (cycle.length === 0) return null;

  // Position in cycle based on counter
  const position = counter % cycle.length;
  const chosenId = cycle[position];

  // Find the chosen candidate
  const chosen = weightedCandidates.find((c: any) => c.id === chosenId)!;

  // Increment counter and persist
  const nextCounter = counter + 1;
  await tx.cRMSetting.update({
    where: { id: settingsId },
    data: {
      lastAssignedSalespersonId: chosenId,
      automationCurrentWeights: nextCounter,
    },
  });

  // If TL_TEAM_AUTO mode, pick a team member from the chosen TL's team
  if (teamAuto && chosen.role === "TEAM_LEAD") {
    const teamMembers = await tx.user.findMany({
      where: { teamLeaderId: chosenId, isActive: true },
      select: { id: true },
      orderBy: { name: "asc" },
    });

    if (teamMembers.length === 0) {
      return chosenId;
    }

    // Block distribution within team: store team counter separately
    const teamCounterKey = `__teamCounter_${chosenId}`;
    const teamCounter = (weights[teamCounterKey] as number) || 0;
    const teamPosition = teamCounter % teamMembers.length;
    const member = teamMembers[teamPosition];

    // Update team counter in weights
    const updatedWeights = { ...weights, [teamCounterKey]: teamCounter + 1 };
    await tx.cRMSetting.update({
      where: { id: settingsId },
      data: { automationWeights: updatedWeights },
    });

    return member.id;
  }

  return chosenId;
}

/**
 * Returns the automation mode string for display purposes.
 */
export async function getAutomationMode(): Promise<string> {
  const settings = await prisma.cRMSetting.findFirst();
  return settings?.automationMode || "DISABLED";
}
