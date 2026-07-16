import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/hash"; // NOTE: apna actual path check kar lein
import { requireAuth } from "@/lib/require-auth";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { name, email, password, phone } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email aur password required hain" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return NextResponse.json(
        { message: "Is email already exsist" },
        { status: 409 },
      );
    }

    const hashedPassword = await hashPassword(password);

    const newAdmin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        role: "ADMIN",
      },
    });

    return NextResponse.json(
      {
        message: "Admin account create ho gaya",
        user: {
          id: newAdmin.id,
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create admin error:", error);
    return NextResponse.json(
      { message: "Server error, dobara try karein" },
      { status: 500 },
    );
  }
}
