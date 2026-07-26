import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings, invalidateSettingsCache } from "@/lib/settings-cache";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

async function getOrCreateSettings() {
  const existing = await getCachedCRMSettings();
  if (existing) return existing;

  return prisma.$transaction(async (tx) => {
    const row = await tx.cRMSetting.findFirst({ orderBy: { createdAt: "asc" } });
    if (row) return row;
    return tx.cRMSetting.create({ data: {} });
  });
}

const VALID_MODES = ["DISABLED", "TL_WEIGHTED", "TL_TEAM_AUTO", "DIRECT_WEIGHTED"];

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const settings = await getOrCreateSettings();

    // Get all eligible users with team info
    const users = await prisma.user.findMany({
      where: { role: { in: ["SALESPERSON", "TEAM_LEAD"] }, isActive: true },
      select: {
        id: true,
        name: true,
        role: true,
        teamLeaderId: true,
        _count: { select: { teamMembers: { where: { isActive: true } } } },
      },
      orderBy: { name: "asc" },
    });

    // Build candidates: TLs and solo SPs (no teamLeaderId)
    const candidates = users
      .filter((u) => u.role === "TEAM_LEAD" || !u.teamLeaderId)
      .map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        teamSize: u.role === "TEAM_LEAD" ? u._count.teamMembers : 0,
      }));

    const weights = (settings.automationWeights as Record<string, number>) || {};

    // Fill default weights for candidates that don't have one
    const enrichedCandidates = candidates.map((c) => ({
      ...c,
      weight: weights[c.id] ?? (c.role === "TEAM_LEAD" ? Math.max(c.teamSize, 1) : 1),
    }));

    return NextResponse.json({
      autoAssignEnabled: settings.autoAssignEnabled,
      automationMode: settings.automationMode || "DISABLED",
      automationWeights: settings.automationWeights || {},
      candidates: enrichedCandidates,
    });
  } catch (err) {
    console.error("Fetch automation setting error:", err);
    return NextResponse.json(
      { error: "Failed to fetch setting" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const { enabled, mode, weights } = body;

    const settings = await prisma.cRMSetting.findFirst({ orderBy: { createdAt: "asc" } });
    if (!settings) {
      return NextResponse.json({ error: "Settings not found" }, { status: 500 });
    }

    const updateData: Record<string, any> = {};

    if (typeof enabled === "boolean") {
      updateData.autoAssignEnabled = enabled;
      // When disabling, also reset mode
      if (!enabled) {
        updateData.automationMode = "DISABLED";
      }
    }

    if (mode !== undefined) {
      if (!VALID_MODES.includes(mode)) {
        return NextResponse.json({ error: "Invalid automation mode" }, { status: 400 });
      }
      updateData.automationMode = mode;
      // Auto-toggle enabled based on mode
      updateData.autoAssignEnabled = mode !== "DISABLED";
    }

    if (weights !== undefined) {
      updateData.automationWeights = weights;
    }

    // Reset round-robin state when mode or weights change
    if (mode !== undefined || weights !== undefined) {
      updateData.lastAssignedSalespersonId = null;
      updateData.automationCurrentWeights = null;
    }

    const updated = await prisma.cRMSetting.update({
      where: { id: settings.id },
      data: updateData,
    });

    invalidateSettingsCache();

    return NextResponse.json({
      autoAssignEnabled: updated.autoAssignEnabled,
      automationMode: updated.automationMode,
      automationWeights: updated.automationWeights,
    });
  } catch (err) {
    console.error("Update automation setting error:", err);
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 },
    );
  }
}
