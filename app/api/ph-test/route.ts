import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/ph-test
 * Test endpoint untuk inject pH data langsung
 *
 * Gunakan untuk testing tanpa ESP32
 *
 * Body:
 * {
 *   "value": 4.0,
 *   "location": "sawah",
 *   "deviceId": "TEST-ESP32"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { value, location = "sawah", deviceId = "TEST-DEVICE" } = body;

    if (!value || value < 0 || value > 14) {
      return NextResponse.json(
        { error: "Invalid pH value. Must be between 0 and 14" },
        { status: 400 },
      );
    }

    const reading = await prisma.pHReading.create({
      data: {
        value: parseFloat(value),
        location,
        deviceId,
        temperature: null,
      },
    });

    console.log(
      `[PH-TEST] Created test reading: pH=${value}, location=${location}`,
    );

    return NextResponse.json(
      {
        success: true,
        message: "Test pH data injected",
        data: reading,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[PH-TEST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create test pH reading" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/ph-test
 * Get debugging info tentang pH data
 */
export async function GET() {
  try {
    const latestReadings = await prisma.pHReading.findMany({
      orderBy: { timestamp: "desc" },
      take: 10,
    });

    const latestBylocation = await Promise.all([
      prisma.pHReading.findFirst({
        where: { location: "sawah" },
        orderBy: { timestamp: "desc" },
      }),
      prisma.pHReading.findFirst({
        where: { location: "kolam" },
        orderBy: { timestamp: "desc" },
      }),
    ]);

    return NextResponse.json({
      debug: {
        totalReadings: latestReadings.length,
        latestReadings,
        latestByLocation: {
          sawah: latestBylocation[0],
          kolam: latestBylocation[1],
        },
      },
    });
  } catch (error) {
    console.error("[PH-TEST] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch debug info" },
      { status: 500 },
    );
  }
}
