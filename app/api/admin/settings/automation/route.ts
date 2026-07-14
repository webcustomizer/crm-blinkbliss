import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

async function getAdminId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;

  try {
    const user = await verifyToken(token);
    if (!user || user.role !== "ADMIN") return null;
    return user.id ?? null;
  } catch {
    return null;
  }
}

// CRMSetting hamesha ek hi row hoti hai — agar exist nahi karti to create kar dein
async function getOrCreateSettings() {
  const existing = await prisma.cRMSetting.findFirst();
  if (existing) return existing;

  return prisma.cRMSetting.create({ data: {} });
}

export async function GET(req: NextRequest) {
  const adminId = await getAdminId(req);
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const adminId = await getAdminId(req);
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
