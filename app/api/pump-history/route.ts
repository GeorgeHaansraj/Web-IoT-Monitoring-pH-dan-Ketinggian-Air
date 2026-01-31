import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "sawah";
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Ambil riwayat aktivasi pompa
    const pumpHistory = await prisma.pumpHistory.findMany({
      where: { mode },
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: offset,
    });

    // Hitung total records
    const total = await prisma.pumpHistory.count({
      where: { mode },
    });

    return NextResponse.json({
      success: true,
      mode,
      data: pumpHistory,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching pump history:", error);
    return NextResponse.json(
      { error: "Failed to fetch pump history" },
      { status: 500 },
    );
  }
}
