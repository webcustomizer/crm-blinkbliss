import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // apna prisma client ka path yahan confirm/adjust karein
import { verifyToken } from "@/lib/auth";

async function getAdminId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;

  try {
    const user = await verifyToken(token);
    if (!user || user.role !== "ADMIN") return null;

    // ⚠️ Agar JWT payload mein id ka field naam "id" ke ilawa kuch aur hai
    // (jaise "userId" ya "sub"), to yahan replace kar dein: user.userId ya user.sub
    return user.id ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const adminId = await getAdminId(req);
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
