"use client";

import { useState } from "react";
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

export default function PHHistoryGraph() {
  const [range, setRange] = useState<TimeRange>("hour");

  // Data mapping tetap sama (24 jam, 7 hari, 12 bulan, dsb)
  const dataMapping = {
    hour: Array.from({ length: 24 }, (_, i) => ({
      t: `${i.toString().padStart(2, "0")}:00`,
      ph: 7 + Math.random() * 0.4 - 0.2,
    })),
    day: [
      { t: "Senin", ph: 7.1 },
      { t: "Selasa", ph: 7.3 },
      { t: "Rabu", ph: 7.0 },
      { t: "Kamis", ph: 7.4 },
      { t: "Jumat", ph: 7.2 },
      { t: "Sabtu", ph: 7.1 },
      { t: "Minggu", ph: 7.3 },
    ],
    month: [
      { t: "Januari", ph: 7.0 },
      { t: "Februari", ph: 7.2 },
      { t: "Maret", ph: 7.5 },
      { t: "April", ph: 7.1 },
      { t: "Mei", ph: 6.8 },
      { t: "Juni", ph: 7.3 },
      { t: "Juli", ph: 7.4 },
      { t: "Agustus", ph: 7.2 },
      { t: "September", ph: 7.0 },
      { t: "Oktober", ph: 7.1 },
      { t: "November", ph: 6.9 },
      { t: "Desember", ph: 7.0 },
    ],
    year: [
      { t: "2021", ph: 7.2 },
      { t: "2022", ph: 7.0 },
      { t: "2023", ph: 7.5 },
      { t: "2024", ph: 7.1 },
      { t: "2025", ph: 6.8 },
      { t: "2026", ph: 7.3 },
    ],
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
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dataMapping[range]}
                margin={{ left: -10, right: 30, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="colorPh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
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
          </div>
        </div>
      </div>
    </div>
  );
}
