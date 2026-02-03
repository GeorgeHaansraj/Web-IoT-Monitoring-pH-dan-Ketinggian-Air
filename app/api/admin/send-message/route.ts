import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();

    // Check if user is authenticated and is admin
    if (!session || (session.user as { role?: string })?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 },
      );
    }

    const { userId, message } = await request.json();

    if (!userId || !message || !message.trim()) {
      return NextResponse.json(
        { error: "userId dan message diperlukan" },
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

    // Prevent admin sending messages to other admins
    if (user.role === "admin") {
      return NextResponse.json(
        { error: "Tidak dapat mengirim pesan ke akun administrator" },
        { status: 400 },
      );
    }

    // Store message in database
    const savedMessage = await prisma.adminMessage.create({
      data: {
        userId,
        message: message.trim(),
      },
    });

    console.log(
      `[MESSAGE] Admin ${session.user?.email} sent message to ${user.email}:`,
      message,
    );

    return NextResponse.json(
      {
        success: true,
        message: "Pesan berhasil dikirim",
        data: {
          messageId: savedMessage.id,
          userId,
          sentAt: savedMessage.createdAt.toISOString(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[MESSAGE] Error sending message:", error);
    return NextResponse.json(
      { error: "Gagal mengirim pesan" },
      { status: 500 },
    );
  }
}
