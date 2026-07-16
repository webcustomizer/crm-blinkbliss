import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || "";

    const page = Number(searchParams.get("page") || 1);

    const limit = Number(searchParams.get("limit") || 20);

    const skip = (page - 1) * limit;

    const where = {
      status: "JOINED" as const,

      OR: search
        ? [
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },

            {
              phone: {
                contains: search,
                mode: "insensitive" as const,
              },
            },

            {
              city: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ]
        : undefined,
    };

    const [customers, total] = await Promise.all([
      prisma.lead.findMany({
        where,

        skip,

        take: limit,

        select: {
          id: true,

          name: true,

          phone: true,

          city: true,

          purpose: true,

          updatedAt: true,

          assignedTo: {
            select: {
              id: true,

              name: true,
            },
          },
        },

        orderBy: {
          updatedAt: "desc",
        },
      }),

      prisma.lead.count({
        where,
      }),
    ]);

    return NextResponse.json({
      customers,

      pagination: {
        page,

        limit,

        total,

        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("CUSTOMERS API ERROR:", error);

    return NextResponse.json(
      {
        message: "Failed to fetch customers.",
      },

      {
        status: 500,
      },
    );
  }
}
