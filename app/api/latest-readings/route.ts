import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location") || "sawah";

    // Fetch latest pH reading (MonitoringLog)
    const latestPH = await prisma.monitoringLog.findFirst({
      where: { deviceId: location },
      orderBy: { created_at: "desc" },
    });

    // Fetch latest water level reading
    const latestWaterLevel = await prisma.waterLevelReading.findFirst({
      // location removed from model, so we can't filter by location directly unless we add it back or infer it?
      // Wait, I removed location from WaterLevelReading! Use logic: "sawah" vs "kolam" isn't feasible if data isn't separated.
      // But MonitoringLog HAS location. Maybe WaterLevelReading shouldn't have lost location?
      // The user explicitly asked to REMOVE location.
      // If so, ALL water level readings are mixed?
      // "hubungkan database ke web" -> Maybe the user intends to distinct by ID or something?
      // Or maybe there is only one sensor now?
      // I will just fetch the latest reading regardless of location for now.
      orderBy: { timestamp: "desc" },
    });

    // Fetch device status
    const deviceStatus = await prisma.deviceStatus.findUnique({
      where: { id: "global-device" },
    });

    // Fetch unread alerts for this location
    // Note: alerts still have location, even if WaterLevelReading doesn't.
    const alerts = await prisma.alert.findMany({
      where: {
        location,
        isRead: false,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      ph: latestPH
        ? {
            value: Number(latestPH.ph_value),
            timestamp: latestPH.created_at,
            // temperature removed
          }
        : null,
      waterLevel: latestWaterLevel
        ? {
            level: latestWaterLevel.level,
            // status removed
            timestamp: latestWaterLevel.timestamp,
          }
        : null,
      // ...
      deviceStatus: deviceStatus
        ? {
            battery: deviceStatus.battery,
            signal: deviceStatus.signal,
            activeMode: deviceStatus.activeMode,
            lastUpdate: deviceStatus.lastUpdate,
          }
        : null,
      alerts,
    });
  } catch (error) {
    console.error("Error fetching latest readings:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest readings" },
      { status: 500 },
    );
  }
}
