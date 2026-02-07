import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/monitoring-log
 * Receive monitoring data from Arduino/PHP Bridge and store in monitoring_logs
 *
 * Expected payload:
 * {
 *   "battery_level": 85,
 *   "ph_value": 7.5,
 *   "level": 25.5,
 *   "temperature": 28.3,
 *   "signal_strength": 15,
 *   "deviceId": "ESP32-KKN-01"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      battery_level,
      ph_value,
      level,
      temperature,
      signal_strength,
      deviceId,
    } = body;

    // Create monitoring log entry
    const log = await prisma.monitoringLog.create({
      data: {
        battery_level: battery_level ? parseFloat(battery_level) : null,
        ph_value: ph_value ? parseFloat(ph_value) : null,
        level: level ? parseFloat(level) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        signal_strength: signal_strength ? parseInt(signal_strength) : null,
        deviceId: deviceId || "default",
        created_at: new Date(),
      },
    });

    // JUGA simpan pH ke PHReading untuk grafik history
    if (ph_value) {
      await prisma.pHReading.create({
        data: {
          value: parseFloat(ph_value),
          location: "kolam", // Default location, bisa diubah dari parameter jika perlu
          deviceId: deviceId || "default",
          temperature: temperature ? parseFloat(temperature) : null,
        },
      });
    }

    console.log(
      `[MONITORING-LOG] Created entry: Battery=${log.battery_level}%, pH=${log.ph_value}, Level=${log.level}cm`,
    );

    return NextResponse.json(
      {
        success: true,
        message: "Monitoring data logged successfully",
        id: log.id,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("[MONITORING-LOG] Error:", error);

    // Handle database errors gracefully
    if (error?.code === "P2021" || error?.code === "P2022") {
      return NextResponse.json(
        {
          success: false,
          error: "Database table not found. Run migrations first.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to log monitoring data",
        details: error?.message,
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/monitoring-log
 * Get latest monitoring log
 */
export async function GET(request: NextRequest) {
  try {
    // Verify prisma instance
    if (!prisma) {
      throw new Error("Prisma client is not initialized");
    }

    const latestLog = await prisma.monitoringLog.findFirst({
      orderBy: { created_at: "desc" },
    });

    if (!latestLog) {
      return NextResponse.json(
        {
          success: true,
          data: null,
          message: "No monitoring data available",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        battery_level: latestLog.battery_level,
        ph_value: latestLog.ph_value,
        level: latestLog.level,
        temperature: latestLog.temperature,
        signal_strength: latestLog.signal_strength,
        created_at: latestLog.created_at,
        deviceId: latestLog.deviceId,
      },
    });
  } catch (error: any) {
    console.error("[MONITORING-LOG] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch monitoring data",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
