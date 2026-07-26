import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["SALESPERSON"]);
  if ("error" in auth) return auth.error;
  try {
    const settings = await getCachedCRMSettings();
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { teamLeaderId: true },
    });
    return NextResponse.json({
      success: true,
      data: {
        groupChatEnabled: settings?.groupChatEnabled !== false,
        tlGroupChatEnabled: settings?.tlGroupChatEnabled !== false,
        messageEnabled: settings?.messageEnabled !== false,
        tlMessageEnabled: settings?.tlMessageEnabled !== false,
        hasTeamLeader: !!user?.teamLeaderId,
        passwordMinLength: settings?.passwordMinLength || 8,
        passwordRequireSpecial: settings?.passwordRequireSpecial || false,
        maxFollowUps: settings?.maxFollowUps ?? 3,
      },
    });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
