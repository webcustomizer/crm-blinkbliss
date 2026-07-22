import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedCRMSettings } from "@/lib/settings-cache";
import { hashPassword } from "@/lib/hash";
import { requireAuth } from "@/lib/require-auth";
import { validatePasswordStrength } from "@/lib/password-validator";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ["ADMIN"]);
  if ("error" in auth) return auth.error;

  try {
    const { name, email, password, phone } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email and password are required." },
        { status: 400 },
      );
    }

    const settings = await getCachedCRMSettings();
    const validation = validatePasswordStrength(
      password,
      settings?.passwordMinLength || 8,
      settings?.passwordRequireSpecial || false,
    );
    if (!validation.valid) {
      return NextResponse.json({ message: validation.errors[0] }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: "Email already exists." }, { status: 409 });
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
        message: "Admin account created successfully",
        user: { id: newAdmin.id, name: newAdmin.name, email: newAdmin.email, role: newAdmin.role },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create admin error:", error);
    return NextResponse.json({ message: "Server error, please try again." }, { status: 500 });
  }
}
