import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

/**
 * POST /api/user/change-password
 * Ubah password user yang sudah login
 *
 * Request body:
 * {
 *   currentPassword: string,
 *   newPassword: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Cek session
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - silakan login terlebih dahulu" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    // Validasi input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Sandi saat ini dan sandi baru harus diisi" },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Sandi baru harus minimal 6 karakter" },
        { status: 400 },
      );
    }

    // Cari user berdasarkan email dari session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    // Verifikasi sandi saat ini
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Sandi saat ini tidak sesuai" },
        { status: 403 },
      );
    }

    // Hash sandi baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password di database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    console.log(`[SECURITY] Password user ${user.email} berhasil diubah`);

    return NextResponse.json(
      {
        success: true,
        message: "Sandi berhasil diubah",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[ERROR] Change password failed:", error);
    return NextResponse.json(
      { error: "Gagal mengubah sandi" },
      { status: 500 },
    );
  }
}
