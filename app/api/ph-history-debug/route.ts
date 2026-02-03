import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/ph-history-debug
 * Debug endpoint - Lihat raw data di database dan clear data lama jika diperlukan
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action"); // "view", "clear"

    if (action === "clear") {
      // Hapus SEMUA data PHReading lama
      const deleted = await prisma.pHReading.deleteMany({});
      console.log(`[PH-DEBUG] Deleted ${deleted.count} old pH readings`);

      return NextResponse.json({
        success: true,
        message: `Deleted ${deleted.count} old pH readings`,
        deletedCount: deleted.count,
      });
    }

    // View raw data
    const allReadings = await prisma.pHReading.findMany({
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    console.log(
      `[PH-DEBUG] Found ${allReadings.length} pH readings in database`,
    );

    // Group by date untuk melihat pattern
    const groupedByDay: { [key: string]: any[] } = {};
    allReadings.forEach((r) => {
      const date = new Date(r.timestamp);
      const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
      if (!groupedByDay[dateKey]) {
        groupedByDay[dateKey] = [];
      }
      groupedByDay[dateKey].push(r);
    });

    const summary = Object.entries(groupedByDay).map(([date, readings]) => ({
      date,
      count: readings.length,
      values: readings.map((r) => r.value),
      min: Math.min(...readings.map((r) => r.value)),
      max: Math.max(...readings.map((r) => r.value)),
      avg: readings.reduce((sum, r) => sum + r.value, 0) / readings.length,
      timestamps: readings.map((r) => r.timestamp.toISOString()),
    }));

    return NextResponse.json({
      success: true,
      totalReadings: allReadings.length,
      recentReadings: allReadings.slice(0, 10),
      summary,
    });
  } catch (error: any) {
    console.error("[PH-DEBUG] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message,
      },
      { status: 500 },
    );
  }
}
