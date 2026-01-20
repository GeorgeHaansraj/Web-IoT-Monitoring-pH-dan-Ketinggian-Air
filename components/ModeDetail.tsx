"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft, FlaskConical, Activity, Waves } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import SumurViz from "./visualizations/SumurViz";
import SawahViz from "./visualizations/SawahViz";
import KolamViz from "./visualizations/KolamViz";
import PHHistoryGraph from "./PHHistoryGraph";

interface ModeDetailProps {
  mode: "sawah" | "sumur" | "kolam";
}

export default function ModeDetail({ mode }: ModeDetailProps) {
  const router = useRouter();
  const [currentPH, setCurrentPH] = useState(7.37);
  const [phData, setPhData] = useState<{ time: string; ph: number }[]>([]);
  const [waterLevel, setWaterLevel] = useState(46);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Simulasi Data (Ganti dengan MQTT nantinya)
  useEffect(() => {
    const initialData = Array.from({ length: 6 }, (_, i) => ({
      time: "Now",
      ph: 7 + Math.random() * 0.5 - 0.25,
    }));
    setPhData(initialData);

    const interval = setInterval(() => {
      const newPH = 7 + Math.random() * 0.4 - 0.2;
      setCurrentPH(newPH);
      setPhData((prev) => [...prev.slice(1), { time: "Now", ph: newPH }]);
      setWaterLevel((prev) =>
        Math.max(0, Math.min(100, prev + (Math.random() * 4 - 2))),
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const config = {
    sawah: {
      name: "Sawah",
      icon: "🌾",
      activeColor: "text-green-600",
      activeBg: "bg-green-50",
      border: "border-green-500",
    },
    sumur: {
      name: "Sumur",
      icon: "🚰",
      activeColor: "text-blue-600",
      activeBg: "bg-blue-50",
      border: "border-blue-500",
    },
    kolam: {
      name: "Kolam",
      icon: "🐟",
      activeColor: "text-cyan-600",
      activeBg: "bg-cyan-50",
      border: "border-cyan-500",
    },
  }[mode];

  // 2. LOGIKA PEMILIHAN VISUALISASI
  const renderWaterVisualization = () => {
    switch (mode) {
      case "sawah":
        return <SawahViz level={waterLevel} />;
      case "kolam":
        return <KolamViz level={waterLevel} />;
      case "sumur":
      default:
        return <SumurViz level={waterLevel} />;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-[#fafafa] min-h-screen p-4 pb-10 space-y-4 font-sans text-[#171717]">
      {/* 1. Header Navigation */}
      <div className="flex items-center gap-4 py-2">
        <button onClick={() => router.push("/")} className="p-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Mode {config.name}</h1>
          <p className="text-xs text-gray-500">Detail Monitoring pH</p>
        </div>
      </div>

      {/* 2. Status Mode Card */}
      <div
        className={`flex items-center justify-between p-4 rounded-xl border-2 ${config.activeBg} ${config.border}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{config.icon}</span>
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-medium">
              Button Mode
            </p>
            <p className={`text-lg font-bold ${config.activeColor}`}>ACTIVE</p>
          </div>
        </div>
        <Activity className={`${config.activeColor} w-6 h-6 animate-pulse`} />
      </div>

      {/* 3. pH Real-time Card */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-4 text-purple-600">
          <FlaskConical className="w-5 h-5" />
          <h2 className="text-lg text-black">pH Real-time</h2>
        </div>
        <div className="text-center space-y-1">
          <div className="text-7xl tracking-tighter">
            {currentPH.toFixed(2)}
          </div>
          <p className="text-sm text-gray-500">pH Level</p>
        </div>

        {/* pH Range Bar */}
        <div className="mt-8 space-y-2">
          <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-green-500 transition-all duration-1000"
              style={{ width: `${(currentPH / 14) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 font-medium px-1">
            <span>Asam (4)</span>
            <span>Netral (7)</span>
            <span>Basa (14)</span>
          </div>
        </div>
      </div>

      {/* 5. Water Level Card (Ultrasonic) */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-6 text-blue-600">
          <Waves className="w-5 h-5" />
          <h2 className="text-lg text-black">Level Air</h2>
        </div>

        {/* 3. PANGGIL FUNGSI RENDER DI SINI */}
        <div className="mb-4 flex justify-center">
          {renderWaterVisualization()}
        </div>
      </div>

      {/* 6. Grafik Riwayat pH */}
      <PHHistoryGraph />
    </div>
  );
}
