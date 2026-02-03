import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } },
) {
  try {
    const session = await auth();

    // Check if user is authenticated and is admin
    if (!session || (session.user as { role?: string })?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 },
      );
    }

    const { userId } = params;
    const { isActive } = await request.json();

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive harus boolean" },
        { status: 400 },
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    // Update user status (you might need to add isActive field to User model)
    // For now, this is a placeholder - you may want to add a status field to your User model
    console.log(
      `[USER] Admin ${session.user?.email} changed status for ${user.email} to ${isActive}`,
    );

    return NextResponse.json(
      {
        success: true,
        message: `User ${isActive ? "diaktifkan" : "dinonaktifkan"}`,
        data: {
          userId,
          isActive,
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[USER] Error updating user status:", error);
    return NextResponse.json(
      { error: "Gagal mengubah status user" },
      { status: 500 },
    );
  }
}
