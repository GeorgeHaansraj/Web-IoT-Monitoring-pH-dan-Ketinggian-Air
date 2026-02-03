import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
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

    const { userId } = await params;

    // Prevent deleting yourself
    if (userId === session.user?.id) {
      return NextResponse.json(
        { error: "Tidak dapat menghapus akun Anda sendiri" },
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

    // Delete user and related pump history records (cascade)
    const deletedUser = await prisma.user.delete({
      where: { id: userId },
      include: {
        pumpHistory: true, // Include related records in response for logging
      },
    });

    const relatedRecordsCount = deletedUser.pumpHistory?.length || 0;
    console.log(
      `[USER] Admin ${session.user?.email} deleted user ${user.email}. Related records deleted: ${relatedRecordsCount}`,
    );

    return NextResponse.json(
      {
        success: true,
        message: `User ${user.email} berhasil dihapus beserta ${relatedRecordsCount} data terkait`,
        data: {
          userId,
          userEmail: user.email,
          relatedRecordsDeleted: relatedRecordsCount,
          deletedAt: new Date().toISOString(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[USER] Error deleting user:", error);
    return NextResponse.json(
      { error: "Gagal menghapus user - mungkin ada data yang masih terkait" },
      { status: 500 },
    );
  }
}
