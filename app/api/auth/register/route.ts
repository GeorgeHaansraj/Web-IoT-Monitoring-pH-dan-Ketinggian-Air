import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nama, noTelp, password } = body;

    // Validasi input
    if (!nama || !noTelp || !password) {
      return NextResponse.json(
        { error: "Nama, nomor telepon, dan password harus diisi" },
        { status: 400 },
      );
    }

    // Validasi format nomor telepon (Indonesia format, 10-13 digits)
    const phoneRegex = /^(\+62|0)[0-9]{9,12}$/;
    if (!phoneRegex.test(noTelp.replace(/\s/g, ""))) {
      return NextResponse.json(
        { error: "Nomor telepon tidak valid" },
        { status: 400 },
      );
    }

    // Check if user already exists by phone
    const existingUser = await prisma.user.findUnique({
      where: { phone: noTelp },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Nomor telepon sudah terdaftar" },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with default role
    const user = await prisma.user.create({
      data: {
        fullName: nama,
        phone: noTelp,
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
