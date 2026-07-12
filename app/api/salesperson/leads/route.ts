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

    const leads = await prisma.lead.findMany({
      where: {
        assignedToId: salespersonId,

        ...(status !== "ALL" && {
          status: status as any,
        }),

        ...(search && {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
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
                mode: "insensitive",
              },
            },
          ],
        }),
      },

      orderBy: {
        createdAt: "desc",
      },

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
    });

    return NextResponse.json({
      leads,

      total: leads.length,
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
