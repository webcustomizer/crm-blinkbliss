import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { broadcastSettingsChange } from "@/lib/realtime";
// Settings changes are automatically pushed via Supabase Postgres Changes (CRMSetting table)

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let settings = await prisma.cRMSetting.findFirst();
    if (!settings) {
      settings = await prisma.cRMSetting.create({ data: {} });
    }
    return NextResponse.json({ success: true, data: settings });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to load settings." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    let settings = await prisma.cRMSetting.findFirst();
    if (!settings) {
      settings = await prisma.cRMSetting.create({ data: {} });
    }

    const updated = await prisma.cRMSetting.update({
      where: { id: settings.id },
      data: {
        ...(body.firstFollowUpDays !== undefined && { firstFollowUpDays: body.firstFollowUpDays }),
        ...(body.secondFollowUpDays !== undefined && { secondFollowUpDays: body.secondFollowUpDays }),
        ...(body.thirdFollowUpDays !== undefined && { thirdFollowUpDays: body.thirdFollowUpDays }),
        ...(body.maxFollowUps !== undefined && { maxFollowUps: body.maxFollowUps }),
        ...(body.autoDeadEnabled !== undefined && { autoDeadEnabled: body.autoDeadEnabled }),
        ...(body.deadAfterDays !== undefined && { deadAfterDays: body.deadAfterDays }),
        ...(body.autoAssignEnabled !== undefined && { autoAssignEnabled: body.autoAssignEnabled }),
        // Group chat
        ...(body.groupChatEnabled !== undefined && { groupChatEnabled: body.groupChatEnabled }),
        ...(body.messageEnabled !== undefined && { messageEnabled: body.messageEnabled }),
        // Security
        ...(body.twoFactorRequired !== undefined && { twoFactorRequired: body.twoFactorRequired }),
        ...(body.passwordMinLength !== undefined && { passwordMinLength: body.passwordMinLength }),
        ...(body.passwordRequireSpecial !== undefined && { passwordRequireSpecial: body.passwordRequireSpecial }),
        ...(body.sessionMaxHours !== undefined && { sessionMaxHours: body.sessionMaxHours }),
        ...(body.forgotPasswordEnabled !== undefined && { forgotPasswordEnabled: body.forgotPasswordEnabled }),
        // Backup
        ...(body.autoBackupEnabled !== undefined && { autoBackupEnabled: body.autoBackupEnabled }),
        ...(body.backupFrequencyDays !== undefined && { backupFrequencyDays: body.backupFrequencyDays }),
      },
    });

    // Broadcast settings change to all connected clients via Supabase Realtime
    const broadcastPayload: Record<string, boolean> = {};
    if (body.groupChatEnabled !== undefined) broadcastPayload.groupChatEnabled = body.groupChatEnabled;
    if (body.messageEnabled !== undefined) broadcastPayload.messageEnabled = body.messageEnabled;
    if (Object.keys(broadcastPayload).length > 0) {
      broadcastSettingsChange(broadcastPayload);
    }

    return NextResponse.json({ success: true, data: updated, message: "Settings updated." });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to update settings." },
      { status: 500 },
    );
  }
}
