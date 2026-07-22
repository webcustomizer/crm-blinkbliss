import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

// CRMSetting hamesha ek hi row hoti hai — agar exist nahi karti to create kar dein
async function getOrCreateSettings() {
  const existing = await getCachedCRMSettings();
  if (existing) return existing;

  return prisma.cRMSetting.create({ data: {} });
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const settings = await getOrCreateSettings();
    return NextResponse.json({ autoAssignEnabled: settings.autoAssignEnabled });
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
    const enabled = Boolean(body?.enabled);

    const settings = await getOrCreateSettings();

    const updated = await prisma.cRMSetting.update({
      where: { id: settings.id },
      data: { autoAssignEnabled: enabled },
    });

    return NextResponse.json({ autoAssignEnabled: updated.autoAssignEnabled });
  } catch (err) {
    console.error("Update automation setting error:", err);
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 },
    );
  }
}
