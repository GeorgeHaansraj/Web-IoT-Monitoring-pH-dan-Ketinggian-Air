import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/monitoring-latest
 * Get the latest monitoring data (battery, pH, level) dari monitoring_logs
 */
export async function GET(request: NextRequest) {
  try {
    // Get latest monitoring log with all data
    const latestLog = await prisma.monitoringLog.findFirst({
      orderBy: { timestamp: "desc" },
    });

    if (!latestLog) {
      console.log(`[MONITORING-LATEST] No monitoring data found`);
      return NextResponse.json(
        {
          success: true,
          data: {
            battery_level: null,
            ph_value: null,
            level: null,
            temperature: null,
            signal_strength: null,
          },
          message: "No data available yet",
        },
        { status: 200 },
      );
    }

    console.log(
      `[MONITORING-LATEST] Latest data: Battery=${latestLog.battery_level}%, pH=${latestLog.ph_value}, Level=${latestLog.level}cm`,
    );

    return NextResponse.json({
      success: true,
      data: {
        battery_level: latestLog.battery_level,
        ph_value: latestLog.ph_value,
        level: latestLog.level,
        temperature: latestLog.temperature,
        signal_strength: latestLog.signal_strength,
        timestamp: latestLog.timestamp,
        deviceId: latestLog.deviceId,
      },
    });
  } catch (error) {
    console.error("[MONITORING-LATEST] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest monitoring data" },
      { status: 500 },
    );
  }
}
