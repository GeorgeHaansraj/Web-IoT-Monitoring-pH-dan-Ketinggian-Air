import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nama, noTelp, username, password } = body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: username }, { name: username }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username sudah digunakan" },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with default role
    const user = await prisma.user.create({
      data: {
        name: nama,
        email: username,
        password: hashedPassword,
        role: "user", // Default role for all users
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: "Pendaftaran berhasil",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Gagal membuat akun" }, { status: 500 });
  }
}
