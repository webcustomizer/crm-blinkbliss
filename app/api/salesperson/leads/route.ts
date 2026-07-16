// app/api/salesperson/leads/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const user = await verifyToken(token);

    if (user.role !== "SALESPERSON") {
      return NextResponse.json(
        {
          message: "Access denied",
        },
        {
          status: 403,
        },
      );
    }

    const salespersonId = user.id;

    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";

    const status = searchParams.get("status") || "ALL";

    // Pagination params — default page 1, 10 per page (LeadsTable ka default pageSize)
    const page = Math.max(1, Number(searchParams.get("page")) || 1);

    const limit = Math.max(1, Number(searchParams.get("limit")) || 10);

    const where = {
      assignedToId: salespersonId,

      ...(status !== "ALL" && {
        status: status as any,
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

        orderBy: {
          createdAt: "desc",
        },

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
