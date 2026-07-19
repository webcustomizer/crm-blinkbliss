import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["SALESPERSON"]);
  if ("error" in auth) return auth.error;
  try {
    const settings = await prisma.cRMSetting.findFirst();
    return NextResponse.json({
      success: true,
      data: {
        groupChatEnabled: settings?.groupChatEnabled !== false,
        messageEnabled: settings?.messageEnabled !== false,
      },
    });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
