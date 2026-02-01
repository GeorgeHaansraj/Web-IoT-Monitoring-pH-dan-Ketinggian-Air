import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/ph-latest
 * Get the latest pH reading dari monitoring_logs
 */
export async function GET(request: NextRequest) {
  try {
    // Get latest pH reading dari monitoring_logs
    const latestReading = await prisma.monitoringLog.findFirst({
      where: {
        ph_value: {
          not: null,
        },
      },
      orderBy: { timestamp: "desc" },
    });

    if (!latestReading) {
      console.log(`[PH-LATEST] No readings found`);
      return NextResponse.json(
        {
          success: true,
          value: null,
          message: "No data available yet",
        },
        { status: 200 },
      );
    }

    console.log(
      `[PH-LATEST] Latest pH: ${latestReading.ph_value} (${latestReading.timestamp})`,
    );

    return NextResponse.json({
      success: true,
      value: latestReading.ph_value,
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
