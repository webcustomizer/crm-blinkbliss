import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // apna prisma client ka path yahan confirm/adjust karein
import { requireAuth } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const salespeople = await prisma.user.findMany({
      where: { role: "SALESPERSON", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(salespeople);
  } catch (err) {
    console.error("Fetch salespeople error:", err);
    return NextResponse.json(
      { error: "Failed to fetch salespeople" },
      { status: 500 },
    );
  }
}
