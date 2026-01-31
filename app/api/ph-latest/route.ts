import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/ph-latest
 * Get the latest pH reading untuk real-time display
 *
 * Query params:
 * - location: "kolam" atau "sawah" (default: "sawah")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location") || "sawah";

    // Get latest pH reading
    const latestReading = await prisma.pHReading.findFirst({
      where: { location },
      orderBy: { timestamp: "desc" },
    });

    if (!latestReading) {
      console.log(`[PH-LATEST] No readings found for ${location}`);
      return NextResponse.json(
        {
          success: true,
          location,
          value: null,
          message: "No data available yet",
        },
        { status: 200 },
      );
    }

    console.log(
      `[PH-LATEST] Latest pH for ${location}: ${latestReading.value} (${latestReading.timestamp})`,
    );

    return NextResponse.json({
      success: true,
      location,
      value: latestReading.value,
      temperature: latestReading.temperature,
      timestamp: latestReading.timestamp,
      deviceId: latestReading.deviceId,
    });
  } catch (error) {
    console.error("[PH-LATEST] Error fetching latest pH:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest pH reading" },
      { status: 500 },
    );
  }
}
