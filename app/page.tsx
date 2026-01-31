"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import {
  Battery,
  DollarSign,
  Wifi,
  WifiOff,
  Droplet,
  LogOut,
  UserCircle,
  FlaskConical,
  Waves,
} from "lucide-react";
import SawahViz from "@/components/visualizations/SawahViz";
import KolamViz from "@/components/visualizations/KolamViz";
import WaterLevelMeter from "@/components/visualizations/WaterLevelMeter";
import PHHistoryGraph from "@/components/PHHistoryGraph";
import { toast } from "sonner";
import mqtt from "mqtt";

export default function Dashboard() {
  const router = useRouter();
  const sessionData = useSession();
  const session = sessionData.data;
  const status = sessionData.status;

  type UserRole = "sawah" | "kolam";
  const userRole = (session?.user as { role?: UserRole })?.role;
  const isLoading = status === "loading";

  const [battery, setBattery] = useState(85);
  const [credit, setCredit] = useState(50000);
  const [kuota, setKuota] = useState(4.5);
  const [isOnline, setIsOnline] = useState(true);

  // Mode Detail States - untuk ketiga mode
  const [deviceActualLocation, setDeviceActualLocation] =
    useState<string>("sawah");

  // Sawah Mode Data
  const [sawahPumpOn, setSawahPumpOn] = useState(false);
  const [sawahPH, setSawahPH] = useState(7.37);
  const [sawahPhData, setSawahPhData] = useState<
    { time: string; ph: number }[]
  >([]);
  const [sawahWaterLevel, setSawahWaterLevel] = useState(45); // dalam cm

  // Kolam Mode Data
  const [kolamPumpOn, setKolamPumpOn] = useState(false);
  const [kolamPH, setKolamPH] = useState(7.45);
  const [kolamPhData, setKolamPhData] = useState<
    { time: string; ph: number }[]
  >([]);
  const [kolamWaterLevel, setKolamWaterLevel] = useState(120); // dalam cm

  // Fetch device status from database on mount
  useEffect(() => {
    const fetchDeviceStatus = async () => {
      try {
        const response = await fetch("/api/device-status");
        const data = await response.json();

        if (data.battery !== undefined) setBattery(data.battery);
        if (data.deviceActualLocation)
          setDeviceActualLocation(data.deviceActualLocation);
      } catch (error) {
        console.error("Error fetching device status:", error);
      }
    };

    fetchDeviceStatus();
  }, []);

  // Tidak perlu sinkronisasi dengan userRole lagi karena menampilkan semua mode

  // Simulasi real-time (Tetap sama)
  useEffect(() => {
    const interval = setInterval(() => {
      setBattery((prev) => Math.max(0, prev - Math.random() * 0.5));
      setCredit((prev) => Math.max(0, prev - Math.random() * 100));
      setKuota((prev) => Math.max(0, prev - 0.01));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Mode Detail MQTT Connection & Simulation
  useEffect(() => {
    // Koneksi ke HiveMQ via WebSockets
    const client = mqtt.connect("wss://YOUR_HIVEMQ_HOST:8884/mqtt", {
      username: "YOUR_USERNAME",
      password: "YOUR_PASSWORD",
    });

    client.on("connect", () => {
      console.log("Connected to MQTT via Browser");
      client.subscribe(`dwipha/+/+`);
    });

    client.on("message", (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());

        if (topic.includes("sawah")) {
          if (topic.includes("ph")) {
            setSawahPH(payload.value);
            setSawahPhData((prev) => [
              ...prev.slice(1),
              { time: "Now", ph: payload.value },
            ]);
          } else if (topic.includes("water_level")) {
            setSawahWaterLevel(payload.value);
          }
        } else if (topic.includes("kolam")) {
          if (topic.includes("ph")) {
            setKolamPH(payload.value);
            setKolamPhData((prev) => [
              ...prev.slice(1),
              { time: "Now", ph: payload.value },
            ]);
          } else if (topic.includes("water_level")) {
            setKolamWaterLevel(payload.value);
          }
        }
      } catch (error) {
        console.error("Error parsing MQTT message:", error);
      }
    });

    const sawahInitialData = Array.from({ length: 6 }, (_, i) => ({
      time: "Now",
      ph: 7 + Math.random() * 0.5 - 0.25,
    }));
    setSawahPhData(sawahInitialData);

    const kolamInitialData = Array.from({ length: 6 }, (_, i) => ({
      time: "Now",
      ph: 7.4 + Math.random() * 0.5 - 0.25,
    }));
    setKolamPhData(kolamInitialData);

    const interval = setInterval(() => {
      const newSawahPH = 7 + Math.random() * 0.4 - 0.2;
      setSawahPH(newSawahPH);
      setSawahPhData((prev) => [
        ...prev.slice(1),
        { time: "Now", ph: newSawahPH },
      ]);
      setSawahWaterLevel((prev) =>
        Math.max(5, Math.min(80, prev + (Math.random() * 6 - 3))),
      );

      const newKolamPH = 7.4 + Math.random() * 0.4 - 0.2;
      setKolamPH(newKolamPH);
      setKolamPhData((prev) => [
        ...prev.slice(1),
        { time: "Now", ph: newKolamPH },
      ]);
      setKolamWaterLevel((prev) =>
        Math.max(10, Math.min(150, prev + (Math.random() * 8 - 4))),
      );
    }, 3000);

    // Cleanup function
    return () => {
      client.end();
      clearInterval(interval);
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Menghubungkan ke Sistem...
      </div>
    );
  }

  // Mode Detail Config & Functions
  const getPHStatus = (mode: "sawah" | "kolam", ph: number) => {
    if (mode === "kolam") {
      // Kolam Ikan Patin (Rentang Ideal: 6.5 – 8.5)
      if (ph < 6.0) {
        return {
          status: "⚠️ WARNING: ASAM",
          action:
            "Tambahkan kapur pertanian (Dolomit) secara bertahap. Cek sisa pakan di dasar kolam.",
          bgColor: "bg-yellow-50 border-yellow-200",
          textColor: "text-yellow-700",
        };
      }
      if (ph >= 6.5 && ph <= 8.5) {
        return {
          status: "✅ AMAN: OPTIMAL",
          action: "Kondisi air stabil. Lanjutkan pemantauan rutin.",
          bgColor: "bg-green-50 border-green-200",
          textColor: "text-green-700",
        };
      }
      if (ph > 9.0) {
        return {
          status: "⚠️ WARNING: BASA",
          action:
            "Lakukan pergantian air sebanyak 20-30%. Amonia berisiko menjadi racun tinggi.",
          bgColor: "bg-orange-50 border-orange-200",
          textColor: "text-orange-700",
        };
      }
    } else if (mode === "sawah") {
      // Sawah Padi (Rentang Ideal: 5.5 – 7.0)
      if (ph < 5.0) {
        return {
          status: "🚨 ALERT: TANAH ASAM",
          action:
            "Segera aplikasikan kapur dolomit atau abu bakar untuk menaikkan pH agar hara tidak terikat.",
          bgColor: "bg-red-50 border-red-200",
          textColor: "text-red-700",
        };
      }
      if (ph >= 5.5 && ph <= 7.0) {
        return {
          status: "✅ AMAN: SUBUR",
          action:
            "Kondisi tanah ideal untuk penyerapan NPK. Pertahankan genangan air.",
          bgColor: "bg-green-50 border-green-200",
          textColor: "text-green-700",
        };
      }
      if (ph > 7.5) {
        return {
          status: "⚠️ WARNING: ALKALIN",
          action:
            "Gunakan pupuk yang bersifat mengasamkan seperti ZA (Ammonium Sulfat) untuk menekan pH.",
          bgColor: "bg-yellow-50 border-yellow-200",
          textColor: "text-yellow-700",
        };
      }
    }
    return {
      status: "⚠️ ABNORMAL",
      action: "Periksa data sensor pH.",
      bgColor: "bg-gray-50 border-gray-200",
      textColor: "text-gray-700",
    };
  };

  const modeConfig = {
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
  };

  const renderWaterVisualization = () => {
    // Monitoring section always shows sawah data with cm measurement
    return (
      <WaterLevelMeter level={sawahWaterLevel} mode="sawah" maxHeight={80} />
    );
  };

  const handlePumpToggle = (checked: boolean) => {
    // Monitoring section always controls sawah pump
    setSawahPumpOn(checked);

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
    console.log(`MQTT: Pump Sawah ${checked ? "ON" : "OFF"}`);
  };

  // Monitoring section always shows sawah data
  const getCurrentPH = () => sawahPH;
  const getPumpStatus = () => sawahPumpOn;

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 bg-[#fafafa] min-h-screen font-sans">
      {/* Header dengan Link Profil & Tombol Logout */}
      <div className="flex justify-between items-center py-6">
        <div className="text-left">
          <h1 className="text-3xl font-bold text-[#171717]">Dashboard IoT</h1>
          <p className="text-gray-600 italic">
            Selamat datang, {session?.user?.name || "Pengguna"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Link ke Halaman Profil */}
          <Link
            href="/profile"
            className="p-2 text-gray-400 hover:text-gray-800 transition-colors"
            title="Profil Pengguna"
          >
            <UserCircle className="w-8 h-8" />
          </Link>

          {/* Tombol Logout */}
          <button
            onClick={() => signOut()}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Keluar"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* System Info - GRADIENT UI */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4 border border-gray-100">
        <h2 className="text-xl mb-4 font-semibold">Informasi Sistem</h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Battery Widget */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Battery className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600 font-medium">Baterai</span>
            </div>
            <div className="text-2xl font-bold">{battery.toFixed(1)}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${battery}%` }}
              ></div>
            </div>
          </div>

          {/* Credit Widget */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600 font-medium">Pulsa</span>
            </div>
            <div className="text-2xl font-bold">
              Rp{(credit / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-gray-500 mt-1">Tersisa</div>
          </div>
        </div>

        {/* Data Usage Widget */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wifi className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-gray-600 font-medium">Data</span>
          </div>
          <div>
            <div className="text-2xl font-bold">{kuota.toFixed(2)} GB</div>
            <div className="text-xs text-gray-500 mt-1">Tersisa</div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium">Status Koneksi</span>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="w-5 h-5 text-green-600" />
                <span className="text-green-600 font-bold text-sm">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-red-600" />
                <span className="text-red-600 font-bold text-sm">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mode Status Cards - Menampilkan status masing-masing lahan (vertikal) */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold px-1">Status Lahan</h2>

        {/* Sawah Card */}
        <div
          className={`rounded-lg border p-4 ${getPHStatus("sawah", sawahPH).bgColor}`}
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl">🌾</div>
            <div className="flex-1">
              <div
                className={`font-bold text-lg ${getPHStatus("sawah", sawahPH).textColor}`}
              >
                {modeConfig.sawah.name} - pH {sawahPH.toFixed(2)}
              </div>
              <div className="text-xs text-gray-600 mb-1">
                💧 Air: {sawahWaterLevel.toFixed(1)} cm
              </div>
              <div
                className={`text-sm font-semibold mb-2 ${getPHStatus("sawah", sawahPH).textColor}`}
              >
                {getPHStatus("sawah", sawahPH).status}
              </div>
              <div className="text-xs text-gray-700">
                {getPHStatus("sawah", sawahPH).action}
              </div>
            </div>
          </div>
        </div>

        {/* Kolam Card */}
        <div
          className={`rounded-lg border p-4 ${getPHStatus("kolam", kolamPH).bgColor}`}
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl">🐟</div>
            <div className="flex-1">
              <div
                className={`font-bold text-lg ${getPHStatus("kolam", kolamPH).textColor}`}
              >
                {modeConfig.kolam.name} - pH {kolamPH.toFixed(2)}
              </div>
              <div className="text-xs text-gray-600 mb-1">
                💧 Air: {kolamWaterLevel.toFixed(1)} cm
              </div>
              <div
                className={`text-sm font-semibold mb-2 ${getPHStatus("kolam", kolamPH).textColor}`}
              >
                {getPHStatus("kolam", kolamPH).status}
              </div>
              <div className="text-xs text-gray-700">
                {getPHStatus("kolam", kolamPH).action}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monitoring Section - Fixed untuk Sawah */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
        <h2 className="text-xl mb-1 font-semibold">Monitoring Realtime</h2>
        <p className="text-xs text-gray-500 mb-4">
          Data dari Sawah (Mode Default)
        </p>
        <div className="space-y-4">
          {/* pH Real-time Card */}
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4 text-purple-600">
              <FlaskConical className="w-5 h-5" />
              <h2 className="text-lg text-black">pH Real-time</h2>
            </div>
            <div className="text-center space-y-1">
              <div className="text-7xl tracking-tighter">
                {getCurrentPH().toFixed(2)}
              </div>
              <p className="text-sm text-gray-500">pH Level</p>
            </div>
            <div className="mt-8 space-y-2">
              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-green-500 transition-all duration-1000"
                  style={{ width: `${(getCurrentPH() / 14) * 100}%` }}
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

        {/* Grafik Riwayat pH */}
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 border border-gray-100">
          <PHHistoryGraph />
        </div>

        {/* Kontrol Pompa */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Droplet
                className={`w-6 h-6 ${
                  getPumpStatus() ? "text-blue-600" : "text-gray-400"
                }`}
              />
              <div>
                <h2 className="text-lg font-semibold">Kontrol Pompa</h2>
                <p className="text-xs text-gray-500">
                  {getPumpStatus() ? "Pompa Aktif" : "Pompa Mati"}
                </p>
              </div>
            </div>
            <Switch
              checked={getPumpStatus()}
              onCheckedChange={handlePumpToggle}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors px-1 p-3 ${
                getPumpStatus() ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  getPumpStatus() ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </Switch>
          </div>
        </div>
      </div>
    </div>
  );
}
