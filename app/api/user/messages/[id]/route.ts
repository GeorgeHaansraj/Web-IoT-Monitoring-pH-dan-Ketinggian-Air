import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    // Check if user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: messageId } = await params;

    // Verify message exists and belongs to current user
    const message = await prisma.adminMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Pesan tidak ditemukan" },
        { status: 404 },
      );
    }

    if (message.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Tidak bisa menghapus pesan orang lain" },
        { status: 403 },
      );
    }

    // Add current user to dismissedByUserIds (soft delete for this user only)
    const updatedMessage = await prisma.adminMessage.update({
      where: { id: messageId },
      data: {
        dismissedByUserIds: {
          push: session.user.id,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pesan berhasil dihapus dari view Anda",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[MESSAGE] Error dismissing message:", error);
    return NextResponse.json(
      { error: "Gagal menghapus pesan" },
      { status: 500 },
    );
  }
}
