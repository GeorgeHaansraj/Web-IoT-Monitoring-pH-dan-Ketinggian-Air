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

    // Fetch raw data dari monitoring_logs table, kolom ph_value
    const readings = await prisma.monitoringLog.findMany({
      where: {
        created_at: {
          gte: dateFrom,
          lte: now,
        },
        ph_value: {
          not: null, // Hanya ambil yang ada ph_value
        },
      },
      orderBy: { created_at: "asc" },
      select: {
        created_at: true,
        ph_value: true,
      },
    });

    console.log(
      `[PH-HISTORY] Fetched ${readings.length} readings from monitoring_logs (${range})`,
    );

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
    const date = new Date(reading.created_at); // Gunakan created_at dari monitoringLog
    let key: string;
    let label: string;

    if (range === "hour") {
      // Group by hour: "HH:00" untuk 24 jam terakhir
      // Menggunakan kombinasi tanggal + jam untuk unique key
      const dateStr = date.toISOString().split("T")[0];
      const hour = date.getHours().toString().padStart(2, "0");
      key = `${dateStr}-${hour}`;
      label = `${hour}:00`;
    } else if (range === "day") {
      // Group by actual date (YYYY-MM-DD) untuk 7 hari terakhir
      // Bukan hanya nama hari, tapi tanggal sesungguhnya
      const dateStr = date.toISOString().split("T")[0];
      const dayName = [
        "Minggu",
        "Senin",
        "Selasa",
        "Rabu",
        "Kamis",
        "Jumat",
        "Sabtu",
      ][date.getDay()];
      key = dateStr;
      label = dayName; // Tampilkan nama hari, tapi group by actual date
    } else if (range === "month") {
      // Group by actual month-year (YYYY-MM) untuk 12 bulan terakhir
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const monthName = [
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
      ][date.getMonth()];
      key = `${year}-${month}`;
      label = monthName;
    } else if (range === "year") {
      // Group by year
      key = date.getFullYear().toString();
      label = date.getFullYear().toString();
    } else {
      key = reading.created_at.toString();
      label = reading.created_at.toString();
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(reading.ph_value); // Gunakan ph_value dari monitoringLog
  });

  // Convert to array dengan agregasi
  return Object.entries(groups)
    .sort((a, b) => a[0].localeCompare(b[0])) // Sort by key untuk konsistensi
    .map(([key, values]) => ({
      timestamp: key,
      label: key.split("-").pop() || key, // Ambil label dari key jika ada
      ph: parseFloat(
        (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
      ),
      min: parseFloat(Math.min(...values).toFixed(2)),
      max: parseFloat(Math.max(...values).toFixed(2)),
      count: values.length,
    }));
}
