import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["TEAM_LEAD"]);
  if ("error" in auth) return auth.error;

  try {
    const settings = await prisma.cRMSetting.findFirst();
    return NextResponse.json({
      success: true,
      data: {
        messageEnabled: settings?.messageEnabled ?? true,
        tlMessageEnabled: settings?.tlMessageEnabled ?? true,
        groupChatEnabled: settings?.groupChatEnabled ?? false,
        tlGroupChatEnabled: settings?.tlGroupChatEnabled ?? true,
        passwordMinLength: settings?.passwordMinLength ?? 8,
        passwordRequireSpecial: settings?.passwordRequireSpecial ?? false,
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to fetch settings." }, { status: 500 });
  }
}