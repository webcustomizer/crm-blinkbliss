import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await params;
    const { monthlyTarget, targetMonths } = await req.json();

    if (!monthlyTarget || monthlyTarget < 1 || !targetMonths || targetMonths < 1) {
      return NextResponse.json({ success: false, message: "monthlyTarget and targetMonths must be at least 1." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { monthlyTarget, targetMonths },
      }),
      prisma.salesTarget.upsert({
        where: { userId_month_year: { userId: id, month: currentMonth, year: currentYear } },
        create: { userId: id, month: currentMonth, year: currentYear, target: monthlyTarget },
        update: { target: monthlyTarget },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Goal set successfully." });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}
