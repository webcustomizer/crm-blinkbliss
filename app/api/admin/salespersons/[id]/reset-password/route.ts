import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";

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

    const { password } = body;

    if (!password) {
      return NextResponse.json(
        {
          message: "Password is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          message: "Password must be at least 6 characters.",
        },
        {
          status: 400,
        },
      );
    }

    const salesperson = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!salesperson) {
      return NextResponse.json(
        {
          message: "Salesperson not found.",
        },
        {
          status: 404,
        },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const updatedUser = await prisma.user.update({
      where: {
        id,
      },

      data: {
        password: hashedPassword,
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

      message: "Password reset successfully.",

      user: updatedUser,
    });
  } catch (error: any) {
    console.error("RESET PASSWORD ERROR:", error);

    return NextResponse.json(
      {
        message: error.message || "Something went wrong.",
      },
      {
        status: 500,
      },
    );
  }
}
