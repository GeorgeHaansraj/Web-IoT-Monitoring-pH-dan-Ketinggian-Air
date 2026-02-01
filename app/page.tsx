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
import WaterLevelMeter from "@/components/visualizations/WaterLevelMeter";
import { toast } from "sonner";

export default function Dashboard() {
  const router = useRouter();
  const sessionData = useSession();
  const session = sessionData.data;
  const status = sessionData.status;
  const isLoading = status === "loading";

  // Device Data States
  const [battery, setBattery] = useState(85);
  const [credit, setCredit] = useState(50000);
  const [kuota, setKuota] = useState(4.5);
  const [isOnline, setIsOnline] = useState(true);
  const [currentPH, setCurrentPH] = useState(7.0);
  const [isPumpOn, setIsPumpOn] = useState(false);
  const [waterLevel, setWaterLevel] = useState(0);

  // Fetch device status from database on mount
  useEffect(() => {
    const fetchDeviceStatus = async () => {
      try {
        const response = await fetch("/api/device-status");
        const data = await response.json();

        if (data.battery !== undefined) setBattery(data.battery);
      } catch (error) {
        console.error("Error fetching device status:", error);
      }
    };

    fetchDeviceStatus();
  }, []);

  // Fetch pH Real-time from database
  useEffect(() => {
    const fetchPhRealtime = async () => {
      try {
        const response = await fetch(`/api/ph-latest?location=sawah`);
        const data = await response.json();

        if (data.success && data.value !== null) {
          setCurrentPH(data.value);
          console.log(`[PH-REALTIME] Updated pH: ${data.value}`);
        }
      } catch (error) {
        console.error(`[PH-REALTIME] Error fetching pH:`, error);
      }
    };

    fetchPhRealtime();

    // Setup polling interval: update setiap 5 detik
    const pollInterval = setInterval(() => {
      fetchPhRealtime();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, []);

  // Fetch water level
  useEffect(() => {
    const fetchWaterLevel = async () => {
      try {
        const response = await fetch("/api/water-level?location=sawah");
        const data = await response.json();

        if (data.success && data.value !== null) {
          setWaterLevel(data.value);
        }
      } catch (error) {
        console.error("[WATER-LEVEL] Error fetching:", error);
      }
    };

    fetchWaterLevel();

    const pollInterval = setInterval(() => {
      fetchWaterLevel();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, []);

  // Simulasi real-time untuk baterai, pulsa, kuota
  useEffect(() => {
    const interval = setInterval(() => {
      setBattery((prev) => Math.max(0, prev - Math.random() * 0.5));
      setCredit((prev) => Math.max(0, prev - Math.random() * 100));
      setKuota((prev) => Math.max(0, prev - 0.01));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Menghubungkan ke Sistem...
      </div>
    );
  }

  // Function to determine pH color based on value
  const getPhColor = (ph: number): string => {
    if (ph <= 3) {
      return "#DC2626";
    } else if (ph <= 6) {
      const ratio = (ph - 3) / 3;
      const red = Math.round(255);
      const green = Math.round(127 + ratio * 80);
      const blue = Math.round(0);
      return `rgb(${red}, ${green}, ${blue})`;
    } else if (ph < 7) {
      const ratio = (ph - 6) / 1;
      const red = Math.round(200 - ratio * 100);
      const green = Math.round(200);
      const blue = Math.round(0 + ratio * 50);
      return `rgb(${red}, ${green}, ${blue})`;
    } else if (ph === 7) {
      return "#16A34A";
    } else if (ph < 8) {
      const ratio = (ph - 7) / 1;
      const red = Math.round(100 - ratio * 100);
      const green = Math.round(200 - ratio * 50);
      const blue = Math.round(50 + ratio * 150);
      return `rgb(${red}, ${green}, ${blue})`;
    } else if (ph <= 9) {
      const ratio = (ph - 8) / 1;
      return `rgb(${Math.round(100 - ratio * 50)}, ${Math.round(150 - ratio * 30)}, ${Math.round(200 + ratio * 30)})`;
    } else if (ph <= 14) {
      const ratio = (ph - 9) / 5;
      const red = Math.round(50 + ratio * 80);
      const green = Math.round(120 - ratio * 60);
      const blue = Math.round(230 - ratio * 50);
      return `rgb(${red}, ${green}, ${blue})`;
    }
    return "#16A34A";
  };

  const handlePumpToggle = async (checked: boolean) => {
    setIsPumpOn(checked);

    try {
      const response = await fetch("/api/pump-relay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "sawah",
          isOn: checked,
          changedBy: "dashboard",
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal mengirim status pompa ke server");
      }

      const data = await response.json();

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

      console.log(
        `HTTP: Pump ${checked ? "ON" : "OFF"} - Response:`,
        data,
      );
    } catch (error) {
      console.error("Error sending pump status:", error);
      setIsPumpOn(!checked);
      toast("Gagal mengontrol pompa", {
        style: {
          background: "#ffffff",
          color: "#dc2626",
          border: "1px solid #991b1b",
        },
      });
    }
  };

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
          <Link
            href="/profile"
            className="p-2 text-gray-400 hover:text-gray-800 transition-colors"
            title="Profil Pengguna"
          >
            <UserCircle className="w-8 h-8" />
          </Link>

          <button
            onClick={() => signOut()}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Keluar"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* System Info */}
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

      {/* Monitoring Section */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
        <h2 className="text-xl mb-1 font-semibold">Monitoring & Kontrol</h2>
        <div className="space-y-4">
          {/* pH Real-time Card */}
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4 text-purple-600">
              <FlaskConical className="w-5 h-5" />
              <h2 className="text-lg text-black">pH</h2>
            </div>
            <div className="text-center">
              <div
                className="text-7xl tracking-tighter font-semibold transition-colors duration-500"
                style={{ color: getPhColor(currentPH) }}
              >
                {currentPH.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Water Level Card */}
          <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-6 text-blue-600">
              <Waves className="w-5 h-5" />
              <h2 className="text-lg text-black">Selisih Permukaan Air</h2>
            </div>
            <div className="mb-4 flex justify-center">
              <WaterLevelMeter level={waterLevel} mode="sawah" maxHeight={80} />
            </div>
          </div>
        </div>

        {/* Kontrol Pompa */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Droplet
                className={`w-6 h-6 ${
                  isPumpOn ? "text-blue-600" : "text-gray-400"
                }`}
              />
              <div>
                <h2 className="text-lg font-semibold">Kontrol Pompa</h2>
                <p className="text-xs text-gray-500">
                  {isPumpOn ? "Pompa Aktif" : "Pompa Mati"}
                </p>
              </div>
            </div>
            <Switch
              checked={isPumpOn}
              onCheckedChange={handlePumpToggle}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors px-1 p-3 ${
                isPumpOn ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  isPumpOn ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </Switch>
          </div>
        </div>
      </div>
    </div>
  );
}
