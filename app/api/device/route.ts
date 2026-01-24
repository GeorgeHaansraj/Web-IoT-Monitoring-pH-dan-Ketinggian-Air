import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, battery, signal } = body;

    // Update atau buat status perangkat jika belum ada
    const status = await prisma.deviceStatus.upsert({
      where: { id: "global-device" },
      update: { activeMode: mode, battery, signal },
      create: { id: "global-device", activeMode: mode, battery, signal },
    });

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal update status perangkat" },
      { status: 500 },
    );
  }
}
