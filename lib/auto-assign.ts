import { prisma } from "@/lib/prisma";

/**
 * Weighted round-robin auto-assign based on automationMode:
 *
 * DISABLED          → returns null (no auto-assign)
 * TL_WEIGHTED       → picks a TL (weighted), returns TL's id
 * TL_TEAM_AUTO      → picks a TL (weighted), then picks a SP within that team (round-robin), returns SP's id
 * DIRECT_WEIGHTED   → picks any eligible person (weighted), returns their id
 *
 * Weighted round-robin uses smooth weighted algorithm (Nginx style):
 * each candidate gets a "currentWeight" that increases by their weight
 * every round, and the candidate with the highest currentWeight is chosen,
 * then their currentWeight is decreased by the total weight sum.
 *
 * The full currentWeights state is persisted in automationCurrentWeights
 * so the algorithm works correctly with any number of candidates.
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
    const currentWeights = (settings.automationCurrentWeights as Record<string, number>) || {};

    if (mode === "TL_WEIGHTED" || mode === "TL_TEAM_AUTO") {
      return pickFromWeightedPool(tx, weights, currentWeights, ["TEAM_LEAD"], settings.id, mode === "TL_TEAM_AUTO" ? tx : null);
    }

    if (mode === "DIRECT_WEIGHTED") {
      return pickFromWeightedPool(tx, weights, currentWeights, ["SALESPERSON", "TEAM_LEAD"], settings.id, null);
    }

    return null;
  });
}

async function pickFromWeightedPool(
  tx: any,
  weights: Record<string, number>,
  currentWeights: Record<string, number>,
  allowedRoles: string[],
  settingsId: string,
  teamAutoTx: any,
): Promise<string | null> {
  const candidates = await tx.user.findMany({
    where: { role: { in: allowedRoles }, isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  if (candidates.length === 0) return null;

  // Assign weight to each candidate: custom weight from settings, or default
  const weightedCandidates = candidates.map((c: any) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    weight: Math.max(weights[c.id] || 1, 1),
  }));

  const totalWeight = weightedCandidates.reduce((s: number, c: any) => s + c.weight, 0);

  // Restore currentWeights from persisted state, or initialize to 0
  const state: Record<string, number> = {};
  weightedCandidates.forEach((c: any) => {
    state[c.id] = currentWeights[c.id] ?? 0;
  });

  // Add each candidate's weight for THIS round
  weightedCandidates.forEach((c: any) => {
    state[c.id] += c.weight;
  });

  // Pick the candidate with the HIGHEST currentWeight
  let chosen = weightedCandidates[0];
  for (const c of weightedCandidates) {
    if (state[c.id] > state[chosen.id]) {
      chosen = c;
    }
  }

  // Subtract total weight from chosen
  state[chosen.id] -= totalWeight;

  // Persist the updated currentWeights state
  await tx.cRMSetting.update({
    where: { id: settingsId },
    data: {
      lastAssignedSalespersonId: chosen.id,
      automationCurrentWeights: state,
    },
  });

  // If TL_TEAM_AUTO mode, pick a team member from the chosen TL's team
  if (teamAutoTx && chosen.role === "TEAM_LEAD") {
    const teamMembers = await tx.user.findMany({
      where: { teamLeaderId: chosen.id, isActive: true },
      select: { id: true },
      orderBy: { name: "asc" },
    });

    if (teamMembers.length === 0) {
      // No team members — TL gets the lead directly
      return chosen.id;
    }

    // Simple round-robin within team using a separate pointer stored in weights
    const teamPointerKey = `__team_${chosen.id}`;
    const teamPointer = (weights[teamPointerKey] as number) || 0;
    const nextIdx = teamMembers.length > 0 ? teamPointer % teamMembers.length : 0;
    const member = teamMembers[nextIdx];

    // Update team pointer in weights
    const updatedWeights = { ...weights, [teamPointerKey]: (teamPointer + 1) % teamMembers.length };
    await tx.cRMSetting.update({
      where: { id: settingsId },
      data: { automationWeights: updatedWeights },
    });

    return member.id;
  }

  return chosen.id;
}

/**
 * Returns the automation mode string for display purposes.
 */
export async function getAutomationMode(): Promise<string> {
  const settings = await prisma.cRMSetting.findFirst();
  return settings?.automationMode || "DISABLED";
}
