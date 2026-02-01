import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");

    // Location filtering removed as field is deleted
    const readings = await prisma.waterLevelReading.findMany({
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return NextResponse.json(readings);
  } catch (error) {
    console.error("Error fetching water level readings:", error);
    return NextResponse.json(
      { error: "Failed to fetch water level readings" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level, location, mode } = body; // deviceId removed

    // Validasi input
    if (!level || level < 0) {
      return NextResponse.json(
        { error: "Level harus berupa angka positif (dalam cm)" },
        { status: 400 },
      );
    }

    // Tentukan status berdasarkan mode dan ketinggian air (for Alerts only)
    let status = "normal";

    const activeMode = mode || location || "sawah"; // Fallback to sawah or location if mode not sent

    if (activeMode === "sawah") {
      // Sawah: optimal 30-60cm
      if (level < 15) status = "critical";
      else if (level < 30) status = "low";
      else if (level <= 60) status = "normal";
      else if (level < 75) status = "high";
      else status = "very_high";
    } else if (activeMode === "kolam") {
      // Kolam: optimal 80-130cm
      if (level < 40) status = "critical";
      else if (level < 80) status = "low";
      else if (level <= 130) status = "normal";
      else if (level < 150) status = "high";
      else status = "very_high";
    }

    const reading = await prisma.waterLevelReading.create({
      data: {
        level: parseFloat(level),
        // location, deviceId, status removed from schema
      },
    });

    // Buat alert untuk status abnormal
    if (status !== "normal") {
      const severityMap: { [key: string]: string } = {
        critical: "critical",
        low: "medium",
        high: "medium",
        very_high: "high",
      };

      const typeMap: { [key: string]: string } = {
        critical: "water_critical",
        low: "water_low",
        high: "water_high",
        very_high: "water_very_high",
      };

      await prisma.alert.create({
        data: {
          type: typeMap[status] || "water_alert",
          message: `Level air ${status} di ${activeMode}: ${level}cm`,
          location: activeMode, // Alert still needs location context
          severity: severityMap[status] || "medium",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Data level air berhasil disimpan: ${level}cm`,
      reading: reading,
    });
  } catch (error) {
    console.error("Error creating water level reading:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data level air" },
      { status: 500 },
    );
  }
}
