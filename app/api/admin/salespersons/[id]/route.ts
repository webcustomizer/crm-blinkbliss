import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;

    const body = await req.json();

    const updatedUser = await prisma.user.update({
      where: {
        id,
      },

      data: {
        ...(body.name && {
          name: body.name,
        }),

        ...(body.email && {
          email: body.email,
        }),

        ...(body.phone !== undefined && {
          phone: body.phone,
        }),

        ...(body.isActive !== undefined && {
          isActive: body.isActive,
        }),
      },

      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,

      message: "Salesperson updated successfully.",

      user: updatedUser,
    });
  } catch (error: any) {
    console.log(error);

    if (error.code === "P2002") {
      return NextResponse.json(
        {
          message: "Email already exists.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        message: "Something went wrong.",
      },
      {
        status: 500,
      },
    );
  }
}
