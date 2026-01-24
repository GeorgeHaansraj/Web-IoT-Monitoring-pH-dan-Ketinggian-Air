"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FlaskConical,
  Activity,
  Waves,
  Droplet,
  Lock,
  Bold,
} from "lucide-react";
import { Switch } from "@/components/ui/switch"; // Menggunakan komponen Switch dari project Anda
import SawahViz from "./visualizations/SawahViz";
import KolamViz from "./visualizations/KolamViz";
import PHHistoryGraph from "./PHHistoryGraph";
import { toast } from "sonner";

interface ModeDetailProps {
  mode: "sawah" | "kolam";
}

export default function ModeDetail({ mode }: ModeDetailProps) {
  const router = useRouter();

  // 1. State Keamanan & Lokasi Alat
  // deviceActualLocation nantinya diupdate melalui MQTT
  const [deviceActualLocation, setDeviceActualLocation] =
    useState<string>("kolam"); // Simulasi lokasi alat saat ini
  const [pumpOn, setPumpOn] = useState(false);

  // Cek apakah halaman ini cocok dengan lokasi alat saat ini
  const isActive = deviceActualLocation === mode;
  // 2. State Data Monitoring

  const [currentPH, setCurrentPH] = useState(7.37);
  const [phData, setPhData] = useState<{ time: string; ph: number }[]>([]);
  const [waterLevel, setWaterLevel] = useState(46);

  // Simulasi Data (Hanya berjalan jika isActive)
  useEffect(() => {
    if (!isActive) return; // Hentikan simulasi jika mode tidak aktif

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
  }, [isActive]); // Re-run jika status active berubah

  const config = {
    sawah: {
      name: "Sawah",
      icon: "🌾",
      activeColor: "text-green-600",
      activeBg: "bg-green-50",
      border: "border-green-500",
    },
    kolam: {
      name: "Kolam",
      icon: "🐟",
      activeColor: "text-cyan-600",
      activeBg: "bg-cyan-50",
      border: "border-cyan-500",
    },
  }[mode];

  const renderWaterVisualization = () => {
    switch (mode) {
      case "sawah":
        return <SawahViz level={waterLevel} />;
      case "kolam":
      default:
        return <KolamViz level={waterLevel} />;
    }
  };

  const handlePumpToggle = (checked: boolean) => {
    if (!isActive) return;
    setPumpOn(checked);
    if (checked) {
      toast("Pompa air dihidupkan", {
        style: {
          background: "#ffffff",
          color: "#2563eb",
          border: "1px solid #1d4ed8",
        },
      });
    } else {
      toast("Pompa air dimatikan", {
        style: {
          background: "#ffffff",
          color: "#2563eb",
          border: "1px solid #1d4ed8",
        },
      });
    }
    console.log(`MQTT: Pump ${mode} ${checked ? "ON" : "OFF"}`);
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

      {/* 2. Status Mode Card - Indikator ACTIVE/NON ACTIVE */}
      <div
        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-500 ${
          isActive
            ? `${config.activeBg} ${config.border}`
            : "bg-gray-100 border-gray-300 opacity-70"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={`text-3xl ${!isActive && "grayscale"}`}>
            {config.icon}
          </span>
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-medium">
              Status Perangkat
            </p>
            <p
              className={`text-lg font-bold ${isActive ? config.activeColor : "text-gray-400"}`}
            >
              {isActive ? "ACTIVE" : "NON ACTIVE"}
            </p>
          </div>
        </div>
        {isActive ? (
          <Activity className={`${config.activeColor} w-6 h-6 animate-pulse`} />
        ) : (
          <Lock className="text-gray-400 w-6 h-6" />
        )}
      </div>

      {/* 3. Banner Peringatan jika NON ACTIVE */}
      {!isActive && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-600 font-medium text-center">
          Alat sedang terhubung di {deviceActualLocation.toUpperCase()}. Riwayat
          grafik terkunci pada data terakhir.
        </div>
      )}

      {/* 4. BLOK MONITORING (Akan di-FREEZE jika tidak aktif) */}
      <div
        className={`space-y-4 transition-all duration-700 ${
          !isActive
            ? "grayscale opacity-50 pointer-events-none select-none"
            : ""
        }`}
      >
        {/* pH Real-time Card */}
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

        {/* Water Level Card */}
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-6 text-blue-600">
            <Waves className="w-5 h-5" />
            <h2 className="text-lg text-black">Level Air</h2>
          </div>
          <div className="mb-4 flex justify-center">
            {renderWaterVisualization()}
          </div>
        </div>
      </div>

      {/* 4b. Grafik Riwayat pH (Di luar freeze block agar tetap scrollable) */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 border border-gray-100">
        <PHHistoryGraph />
      </div>

      {/* 5. Kontrol Pompa (Dipindahkan dari page.tsx) */}
      <div
        className={`bg-white rounded-xl shadow-md p-6 border transition-all duration-500 ${
          isActive ? "border-gray-100" : "border-red-100 opacity-80"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Droplet
              className={`w-6 h-6 ${pumpOn && isActive ? "text-blue-600" : "text-gray-400"}`}
            />
            <div>
              <h2 className="text-lg font-semibold">Kontrol Pompa</h2>
              <p
                className={`text-xs ${isActive ? "text-gray-500" : "text-red-500 font-medium"}`}
              >
                {isActive
                  ? pumpOn
                    ? "Pompa Aktif"
                    : "Pompa Mati"
                  : "Kontrol Dinonaktifkan"}
              </p>
            </div>
          </div>
          <Switch
            disabled={!isActive} // Disable jika lokasi tidak sesuai
            checked={pumpOn && isActive}
            onCheckedChange={handlePumpToggle}
            // Perbaikan visual toggle (px-1 dan translate-x-6)
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors px-1 p-3 ${
              pumpOn && isActive ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                pumpOn && isActive ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </Switch>
        </div>
      </div>
    </div>
  );
}
