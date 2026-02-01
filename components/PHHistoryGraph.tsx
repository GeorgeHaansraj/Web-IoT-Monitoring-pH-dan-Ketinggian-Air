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
import { format } from "date-fns";

type TimeRange = "hour" | "day" | "month" | "year";

interface MonitoringLog {
  id: number;
  ph_value: string | number;
  created_at: string;
}

export default function PHHistoryGraph() {
  const [range, setRange] = useState<TimeRange>("hour");
  const [data, setData] = useState<{ t: string; ph: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch data based on range (simplified logic: fetch latest 100 for now)
        // Ideally pass range to API to filter by date
        const limitMap = {
          hour: 24,
          day: 7, // Fetching limited points for demo, real implementation needs aggregation
          month: 30,
          year: 12,
        };

        const limit = 100; // Fetch enough history
        const response = await fetch(`/api/ph?limit=${limit}`);
        if (!response.ok) throw new Error("Failed to fetch data");

        const result: MonitoringLog[] = await response.json();

        // Transform data
        // Sort by time ascending for graph
        const sortedData = result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const formattedData = sortedData.map(item => ({
          t: format(new Date(item.created_at), "HH:mm"), // Default format
          ph: Number(item.ph_value),
          originalDate: new Date(item.created_at)
        }));

        setData(formattedData);
      } catch (error) {
        console.error("Error fetching graph data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [range]);

  /**
   * LOGIKA LEBAR DINAMIS:
   * Mengatur lebar berdasarkan jumlah titik data agar setiap titik
   * memiliki ruang minimal 50-80px untuk bernapas.
   */
  const getMinWidth = () => {
    // Dynamic width based on real data length
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

      {/* Selector Periode - Currently just refreshes data */}
      <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
        {(["hour", "day", "month", "year"] as TimeRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all uppercase ${range === r
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
              <div className="flex items-center justify-center h-full text-gray-400">
                Memuat data...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
