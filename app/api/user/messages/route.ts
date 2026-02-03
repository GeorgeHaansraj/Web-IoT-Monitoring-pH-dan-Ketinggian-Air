import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();

    // Check if user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get unread messages for current user
    const messages = await prisma.adminMessage.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to 50 most recent messages
    });

    return NextResponse.json(
      {
        success: true,
        data: messages,
        unreadCount: messages.filter((m) => !m.isRead).length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[MESSAGE] Error fetching messages:", error);
    return NextResponse.json(
      { error: "Gagal mengambil pesan" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    // Check if user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json(
        { error: "messageId diperlukan" },
        { status: 400 },
      );
    }

    // Verify message belongs to current user
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Mark as read
    const updated = await prisma.adminMessage.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pesan ditandai sebagai sudah dibaca",
        data: updated,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[MESSAGE] Error updating message:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate pesan" },
      { status: 500 },
    );
  }
}
