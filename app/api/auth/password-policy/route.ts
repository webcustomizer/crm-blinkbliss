import { NextResponse } from "next/server";
import { getCachedCRMSettings } from "@/lib/settings-cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getCachedCRMSettings();
    return NextResponse.json({
      success: true,
      data: {
        passwordMinLength: settings?.passwordMinLength ?? 8,
        passwordRequireSpecial: settings?.passwordRequireSpecial ?? false,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to load settings." },
      { status: 500 },
    );
  }
}
