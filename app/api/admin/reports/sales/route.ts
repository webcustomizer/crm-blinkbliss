import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    // Fetch salespeople and per-status lead counts separately so the
    // database does the counting (GROUP BY) instead of pulling every
    // lead row into Node and filtering in JS. Scales far better as the
    // leads table grows.
    const [salespeople, counts] = await Promise.all([
      prisma.user.findMany({
        where: { role: "SALESPERSON" },
        select: { id: true, name: true },
      }),
      prisma.lead.groupBy({
        by: ["assignedToId", "status"],
        _count: { _all: true },
      }),
    ]);

    const data = salespeople
      .map((user) => {
        const rows = counts.filter((c) => c.assignedToId === user.id);
        const get = (status: string) =>
          rows.find((r) => r.status === status)?._count._all ?? 0;

        const total = rows.reduce((sum, r) => sum + r._count._all, 0);
        const joined = get("JOINED");

        return {
          id: user.id,
          name: user.name,
          total,
          called: get("CALLED"),
          followups: get("NEED_MORE_FOLLOW_UP"),
          training: get("TRAINING_ATTENDED"),
          reserved: get("SEAT_RESERVED"),
          joined,
          dead: get("DEAD"),
          conversion:
            total === 0 ? 0 : Number(((joined / total) * 100).toFixed(1)),
        };
      })
      .sort((a, b) => b.conversion - a.conversion);

    return NextResponse.json(data);
  } catch (e) {
    console.log(e);

    return NextResponse.json([], {
      status: 500,
    });
  }
}
