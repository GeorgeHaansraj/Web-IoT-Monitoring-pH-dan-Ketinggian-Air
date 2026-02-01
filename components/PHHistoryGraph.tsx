"use client";

import { useState, useEffect } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { BarChart3, MoveHorizontal } from "lucide-react";

type TimeRange = "hour" | "day" | "month" | "year";

type PhDataPoint = {
  timestamp: string;
  label: string;
  ph: number;
  min: number;
  max: number;
  count: number;
};

export default function PHHistoryGraph() {
  const [range, setRange] = useState<TimeRange>("hour");
  const [data, setData] = useState<PhDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data whenever range changes
  useEffect(() => {
    fetchPhHistory();
  }, [range]);

  const fetchPhHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ph-history?range=${range}&limit=100`);

      if (!response.ok) {
        throw new Error("Failed to fetch pH history");
      }

      const result = await response.json();
      console.log(
        `[PH-HISTORY] Fetched ${result.dataPoints} data points for ${range}`,
      );

      // Format data untuk chart
      const formattedData = result.data.map((point: PhDataPoint) => ({
        ...point,
        t: point.label,
      }));

      setData(formattedData);
    } catch (err) {
      console.error("[PH-HISTORY] Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      // Fallback ke dummy data untuk development
      setData(getDummyData(range));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Dummy data fallback untuk development
   */
  const getDummyData = (range: TimeRange): PhDataPoint[] => {
    const dataMapping = {
      hour: Array.from({ length: 24 }, (_, i) => ({
        timestamp: `${i.toString().padStart(2, "0")}:00`,
        label: `${i.toString().padStart(2, "0")}:00`,
        t: `${i.toString().padStart(2, "0")}:00`,
        ph: 7 + Math.random() * 0.4 - 0.2,
        min: 6.8,
        max: 7.2,
        count: 1,
      })),
      day: [
        {
          timestamp: "Minggu",
          label: "Minggu",
          t: "Minggu",
          ph: 7.1,
          min: 6.9,
          max: 7.3,
          count: 1,
        },
        {
          timestamp: "Senin",
          label: "Senin",
          t: "Senin",
          ph: 7.3,
          min: 7.1,
          max: 7.5,
          count: 1,
        },
        {
          timestamp: "Selasa",
          label: "Selasa",
          t: "Selasa",
          ph: 7.0,
          min: 6.8,
          max: 7.2,
          count: 1,
        },
        {
          timestamp: "Rabu",
          label: "Rabu",
          t: "Rabu",
          ph: 7.4,
          min: 7.2,
          max: 7.6,
          count: 1,
        },
        {
          timestamp: "Kamis",
          label: "Kamis",
          t: "Kamis",
          ph: 7.2,
          min: 7.0,
          max: 7.4,
          count: 1,
        },
        {
          timestamp: "Jumat",
          label: "Jumat",
          t: "Jumat",
          ph: 7.1,
          min: 6.9,
          max: 7.3,
          count: 1,
        },
        {
          timestamp: "Sabtu",
          label: "Sabtu",
          t: "Sabtu",
          ph: 7.3,
          min: 7.1,
          max: 7.5,
          count: 1,
        },
      ],
      month: [
        {
          timestamp: "Januari",
          label: "Januari",
          t: "Januari",
          ph: 7.0,
          min: 6.8,
          max: 7.2,
          count: 1,
        },
        {
          timestamp: "Februari",
          label: "Februari",
          t: "Februari",
          ph: 7.2,
          min: 7.0,
          max: 7.4,
          count: 1,
        },
        {
          timestamp: "Maret",
          label: "Maret",
          t: "Maret",
          ph: 7.5,
          min: 7.3,
          max: 7.7,
          count: 1,
        },
        {
          timestamp: "April",
          label: "April",
          t: "April",
          ph: 7.1,
          min: 6.9,
          max: 7.3,
          count: 1,
        },
        {
          timestamp: "Mei",
          label: "Mei",
          t: "Mei",
          ph: 6.8,
          min: 6.6,
          max: 7.0,
          count: 1,
        },
        {
          timestamp: "Juni",
          label: "Juni",
          t: "Juni",
          ph: 7.3,
          min: 7.1,
          max: 7.5,
          count: 1,
        },
        {
          timestamp: "Juli",
          label: "Juli",
          t: "Juli",
          ph: 7.4,
          min: 7.2,
          max: 7.6,
          count: 1,
        },
        {
          timestamp: "Agustus",
          label: "Agustus",
          t: "Agustus",
          ph: 7.2,
          min: 7.0,
          max: 7.4,
          count: 1,
        },
        {
          timestamp: "September",
          label: "September",
          t: "September",
          ph: 7.0,
          min: 6.8,
          max: 7.2,
          count: 1,
        },
        {
          timestamp: "Oktober",
          label: "Oktober",
          t: "Oktober",
          ph: 7.1,
          min: 6.9,
          max: 7.3,
          count: 1,
        },
        {
          timestamp: "November",
          label: "November",
          t: "November",
          ph: 6.9,
          min: 6.7,
          max: 7.1,
          count: 1,
        },
        {
          timestamp: "Desember",
          label: "Desember",
          t: "Desember",
          ph: 7.0,
          min: 6.8,
          max: 7.2,
          count: 1,
        },
      ],
      year: [
        {
          timestamp: "2021",
          label: "2021",
          t: "2021",
          ph: 7.2,
          min: 7.0,
          max: 7.4,
          count: 1,
        },
        {
          timestamp: "2022",
          label: "2022",
          t: "2022",
          ph: 7.0,
          min: 6.8,
          max: 7.2,
          count: 1,
        },
        {
          timestamp: "2023",
          label: "2023",
          t: "2023",
          ph: 7.5,
          min: 7.3,
          max: 7.7,
          count: 1,
        },
        {
          timestamp: "2024",
          label: "2024",
          t: "2024",
          ph: 7.1,
          min: 6.9,
          max: 7.3,
          count: 1,
        },
        {
          timestamp: "2025",
          label: "2025",
          t: "2025",
          ph: 6.8,
          min: 6.6,
          max: 7.0,
          count: 1,
        },
        {
          timestamp: "2026",
          label: "2026",
          t: "2026",
          ph: 7.3,
          min: 7.1,
          max: 7.5,
          count: 1,
        },
      ],
    };
    return dataMapping[range];
  };

  /**
   * LOGIKA LEBAR DINAMIS:
   * Mengatur lebar berdasarkan jumlah titik data agar setiap titik
   * memiliki ruang minimal 50-80px untuk bernapas.
   */
  const getMinWidth = () => {
    switch (range) {
      case "hour":
        return "1400px"; // 24 titik data x ~58px
      case "month":
        return "1000px"; // 12 titik data x ~83px
      case "day":
        return "700px"; // 7 titik data x 100px
      case "year":
        return "600px"; // 6 titik data x 100px
      default:
        return "100%;";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 border border-gray-100 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-800">
          <BarChart3 className="w-5 h-5" />
          <h2 className="text-lg">Riwayat pH</h2>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-blue-500 font-bold bg-blue-50 px-2 py-1 rounded-full animate-pulse">
          <MoveHorizontal className="w-3 h-3" />
          <span>GESER UNTUK DETAIL</span>
        </div>
      </div>

      {/* Selector Periode */}
      <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
        {(["hour", "day", "month", "year"] as TimeRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all uppercase ${
              range === r
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {r === "hour"
              ? "Jam"
              : r === "day"
                ? "Hari"
                : r === "month"
                  ? "Bulan"
                  : "Tahun"}
          </button>
        ))}
      </div>

      {/* Kontainer Scroll */}
      <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        <div style={{ minWidth: getMinWidth() }}>
          <div className="h-[280px] w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                <span>Memuat data pH...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-500">
                <span>Error: {error}</span>
              </div>
            ) : data.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                <span>Belum ada data pH tersedia</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ left: -10, right: 30, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="colorPh" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#3b82f6"
                        stopOpacity={0.15}
                      />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={true}
                    stroke="#C0C0C0"
                  />
                  <XAxis
                    dataKey="t"
                    fontSize={11}
                    tickLine={true}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontWeight: 500 }}
                    dy={15}
                  />
                  <YAxis
                    domain={[4, 10]}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#94a3b8" }}
                    width={45}
                  />
                  <Tooltip
                    cursor={{
                      stroke: "#3b82f6",
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                    }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                      padding: "12px",
                    }}
                    formatter={(value: any, name: string | undefined) => {
                      if (name === "ph") {
                        return [value.toFixed(2), "Rata-rata pH"];
                      }
                      return [value, name];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ph"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorPh)"
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
