// app/api/salesperson/leads/route.ts

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["SALESPERSON"]);
    if ("error" in auth) return auth.error;
    const user = auth.user;

    const salespersonId = user.id;

    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";

    const status = searchParams.get("status") || "ALL";
    const completion = searchParams.get("completion") || "ALL";

    // Pagination params — default page 1, 10 per page (LeadsTable ka default pageSize)
    const page = Math.max(1, Number(searchParams.get("page")) || 1);

    const limit = Math.max(1, Number(searchParams.get("limit")) || 10);

    const where = {
  isDeleted: false,
  assignedToId: salespersonId,

  ...(status !== "ALL" && {
    status: status as any,
  }),

  ...(completion !== "ALL" && {
    completion: completion as any,
  }),

  ...(search && {
    OR: [
      {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
      },

      {
        phone: {
          contains: search,
        },
      },

      {
        city: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
    ],
  }),
};

    // Total count aur current page ka data dono ek sath (parallel) fetch karte hain
    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),

      prisma.lead.findMany({
        where,

        orderBy: [
  {
    completion: "asc",
  },
  {
    createdAt: "desc",
  },
],

        skip: (page - 1) * limit,

        take: limit,

        select: {
          id: true,

          name: true,

          phone: true,

          email: true,

          city: true,

          age: true,

          purpose: true,

          status: true,

          completion: true,

          remarks: true,

          nextFollowUp: true,

          createdAt: true,

          updatedAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      leads,

      total,

      page,

      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Salesperson Leads Error:", error);

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
