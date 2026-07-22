import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

const PIPELINE_STAGES = [
  "NEW", "CALLED", "NEED_MORE_FOLLOW_UP",
  "TRAINING_ATTENDED", "SEAT_RESERVED", "JOINED",
];

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    const where: any = { isDeleted: false };
    if (fromDate) where.createdAt = { ...(where.createdAt || {}), gte: new Date(fromDate) };
    if (toDate) {
      // Convert the "to" date string into end-of-day PKT (23:59:59.999)
      // so leads created on that day aren't excluded by midnight-UTC truncation.
      const toDateObj = new Date(toDate);
      const pktToDate = new Date(toDateObj.getTime() + PKT_OFFSET_MS);
      const year = pktToDate.getUTCFullYear();
      const month = pktToDate.getUTCMonth();
      const day = pktToDate.getUTCDate();
      const endOfDayPKT = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - PKT_OFFSET_MS);
      where.createdAt = { ...(where.createdAt || {}), lte: endOfDayPKT };
    }

    const totalLeads = await prisma.lead.count({ where });

    const stages = await Promise.all(
      PIPELINE_STAGES.map(async (stage) => {
        const count = await prisma.lead.count({ where: { ...where, status: stage as any } });
        return {
          stage,
          count,
          percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
        };
      }),
    );

    // Dead count
    const deadCount = await prisma.lead.count({ where: { ...where, status: "DEAD" as any } });

    return NextResponse.json({
      success: true,
      data: { stages, deadCount, totalLeads },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Failed." }, { status: 500 });
  }
}
