import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const targets = await prisma.teamTarget.findMany({
      include: { team: { select: { id: true, name: true, leader: { select: { id: true, name: true } } } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return NextResponse.json({ success: true, data: targets });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { id, target, achieved } = await req.json();
    if (!id || target === undefined) return NextResponse.json({ success: false, message: "id and target are required." }, { status: 400 });

    const existing = await prisma.teamTarget.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, message: "Target not found." }, { status: 404 });

    const updated = await prisma.teamTarget.update({
      where: { id },
      data: { target, ...(achieved !== undefined ? { achieved } : {}) },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { teamId, month, year, target } = await req.json();
    if (!teamId || !month || !year || !target) return NextResponse.json({ success: false, message: "teamId, month, year, target are required." }, { status: 400 });

    const existing = await prisma.teamTarget.findUnique({ where: { teamId_month_year: { teamId, month, year } } });
    if (existing) return NextResponse.json({ success: false, message: "Target already exists for this month." }, { status: 409 });

    const t = await prisma.teamTarget.create({ data: { teamId, month, year, target } });
    return NextResponse.json({ success: true, data: t });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}