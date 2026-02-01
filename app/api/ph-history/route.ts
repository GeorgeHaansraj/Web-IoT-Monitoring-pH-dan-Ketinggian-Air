import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type TimeRange = "hour" | "day" | "month" | "year";

/**
 * GET /api/ph-history
 * Fetch pH history dengan time-based aggregation
 *
 * Query params:
 * - range: "hour" | "day" | "month" | "year" (default: "hour")
 * - limit: max records (default: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get("range") || "hour") as TimeRange;
    const limit = parseInt(searchParams.get("limit") || "100");

    const now = new Date();

    // Hitung date range berdasarkan period
    let dateFrom: Date;
    let groupBy: string;

    switch (range) {
      case "hour": {
        // Last 24 hours, group by hour
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        groupBy = "hour";
        break;
      }
      case "day": {
        // Last 7 days, group by day
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = "day";
        break;
      }
      case "month": {
        // Last 12 months, group by month
        dateFrom = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000);
        groupBy = "month";
        break;
      }
      case "year": {
        // Last 5 years, group by year
        dateFrom = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
        groupBy = "year";
        break;
      }
      default:
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        groupBy = "hour";
    }

    // Fetch raw data dari database
    const readings = await prisma.pHReading.findMany({
      where: {
        timestamp: {
          gte: dateFrom,
          lte: now,
        },
      },
      orderBy: { timestamp: "asc" },
    });

    console.log(`[PH-HISTORY] Fetched ${readings.length} readings (${range})`);

    // Aggregate data berdasarkan time range
    const aggregated = aggregateByTimeRange(readings, range);

    return NextResponse.json({
      success: true,
      range,
      dataPoints: aggregated.length,
      data: aggregated,
      fetchedAt: new Date(),
    });
  } catch (error: any) {
    console.error("[PH-HISTORY] Error fetching pH history:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch pH history",
        message: error?.message,
      },
      { status: 500 },
    );
  }
}

/**
 * Aggregate pH readings berdasarkan time range
 * Menghitung rata-rata, min, max untuk setiap periode
 */
function aggregateByTimeRange(
  readings: any[],
  range: TimeRange,
): Array<{
  timestamp: string;
  label: string;
  ph: number;
  min: number;
  max: number;
  count: number;
}> {
  const groups: { [key: string]: number[] } = {};

  readings.forEach((reading) => {
    const date = new Date(reading.timestamp);
    let key: string;
    let label: string;

    if (range === "hour") {
      // Group by hour: "00:00", "01:00", etc.
      key = `${date.getHours().toString().padStart(2, "0")}:00`;
      label = `${date.getHours().toString().padStart(2, "0")}:00`;
    } else if (range === "day") {
      // Group by day of week
      const days = [
        "Minggu",
        "Senin",
        "Selasa",
        "Rabu",
        "Kamis",
        "Jumat",
        "Sabtu",
      ];
      key = days[date.getDay()];
      label = days[date.getDay()];
    } else if (range === "month") {
      // Group by month
      const months = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
      ];
      key = months[date.getMonth()];
      label = months[date.getMonth()];
    } else if (range === "year") {
      // Group by year
      key = date.getFullYear().toString();
      label = date.getFullYear().toString();
    } else {
      key = reading.timestamp;
      label = reading.timestamp;
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(reading.value);
  });

  // Convert to array dengan agregasi
  return Object.entries(groups).map(([key, values]) => ({
    timestamp: key,
    label: key,
    ph: parseFloat(
      (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
    ),
    min: parseFloat(Math.min(...values).toFixed(2)),
    max: parseFloat(Math.max(...values).toFixed(2)),
    count: values.length,
  }));
}
