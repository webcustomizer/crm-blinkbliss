import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: "SALESPERSON",
      },

      include: {
        leads: true,
      },
    });

    const data = users
      .map((user) => {
        const total = user.leads.length;

        const joined = user.leads.filter((l) => l.status === "JOINED").length;

        return {
          id: user.id,
          name: user.name,

          total,

          called: user.leads.filter((l) => l.status === "CALLED").length,

          followups: user.leads.filter(
            (l) => l.status === "NEED_MORE_FOLLOW_UP",
          ).length,

          training: user.leads.filter((l) => l.status === "TRAINING_ATTENDED")
            .length,

          reserved: user.leads.filter((l) => l.status === "SEAT_RESERVED")
            .length,

          joined,

          dead: user.leads.filter((l) => l.status === "DEAD").length,

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
