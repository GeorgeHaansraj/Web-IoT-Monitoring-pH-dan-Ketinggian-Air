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
        throw new Error(`HTTP ${response.status}: Failed to fetch pH history`);
      }

      const result = await response.json();
      console.log(
        `[PH-HISTORY] Fetched ${result.dataPoints} data points for ${range}:`,
        result.data,
      );

      // Format data untuk chart
      const formattedData = result.data.map((point: PhDataPoint) => ({
        ...point,
        t: point.label,
      }));

      if (formattedData.length === 0) {
        console.warn(
          `[PH-HISTORY] No data points available for range: ${range}`,
        );
      }

      setData(formattedData);
    } catch (err) {
      console.error("[PH-HISTORY] Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * LOGIKA LEBAR DINAMIS:
   * Mengatur lebar berdasarkan jumlah titik data agar setiap titik
   * memiliki ruang minimal 50px untuk bernapas.
   */
  const getMinWidth = () => {
    const dataLength = data.length || 24;
    return `${Math.max(600, dataLength * 50)}px`;
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
                        return [Number(value).toFixed(2), "Rata-rata pH"];
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
