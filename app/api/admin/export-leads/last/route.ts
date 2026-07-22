import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const lastExport = await prisma.exportLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: {
        type: true,
        label: true,
        recordCount: true,
        createdAt: true,
        exportedBy: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(lastExport);
  } catch (err) {
    console.error("Fetch last export error:", err);
    return NextResponse.json(
      { error: "Failed to fetch last export" },
      { status: 500 },
    );
  }
}
