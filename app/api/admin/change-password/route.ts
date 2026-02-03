import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * POST /api/admin/change-password
 * Admin ubah password mereka sendiri
 *
 * Body:
 * {
 *   oldPassword: string,
 *   newPassword: string,
 *   confirmPassword: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Get session
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Tidak ada autentikasi" },
        { status: 401 },
      );
    }

    const userEmail = (session.user as { email?: string }).email;
    if (!userEmail) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { oldPassword, newPassword, confirmPassword } = body;

    // Validasi input
    if (!oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Semua field harus diisi" },
        { status: 400 },
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Password baru dan konfirmasi tidak cocok" },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 },
      );
    }

    if (oldPassword === newPassword) {
      return NextResponse.json(
        { error: "Password baru harus berbeda dengan password lama" },
        { status: 400 },
      );
    }

    // Get user dari database
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    // Verifikasi old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isOldPasswordValid) {
      return NextResponse.json(
        { error: "Password lama tidak sesuai" },
        { status: 401 },
      );
    }

    // Hash password baru
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password di database
    await prisma.user.update({
      where: { email: userEmail },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Password berhasil diubah",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Gagal mengubah password" },
      { status: 500 },
    );
  }
}
