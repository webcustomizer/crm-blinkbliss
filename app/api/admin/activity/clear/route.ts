import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN"]);
    if ("error" in auth) return auth.error;

    const confirm = req.nextUrl.searchParams.get("confirm") === "true";

    if (!confirm) {
      const count = await prisma.activityLog.count();
      return NextResponse.json({
        success: false,
        message: `This will delete ${count} activity records. Call with ?confirm=true to proceed.`,
        totalCount: count,
      });
    }

    const deleted = await prisma.activityLog.deleteMany({});

    return NextResponse.json({
      success: true,
      message: "All activities deleted successfully",
      deletedCount: deleted.count,
    });
  } catch (error) {
    console.error("Delete Activity Error:", error);

    return NextResponse.json(
      {
        message: "Something went wrong",
      },
      {
        status: 500,
      },
    );
  }
}
