import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

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
