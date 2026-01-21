"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Switch } from "@/components/ui/switch";

import {
  Battery,
  DollarSign,
  Wifi,
  WifiOff,
  Droplet,
  LogOut,
} from "lucide-react";

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
  const [activeMode, setActiveMode] = useState<"sawah" | "kolam">("sawah");
  const [pumpOn, setPumpOn] = useState(false);

  // Sinkronisasi activeMode dengan userRole saat login berhasil
  useEffect(() => {
    if (userRole) {
      setActiveMode(userRole);
    }
  }, [userRole]);

  // Simulasi real-time (Tetap sama)
  useEffect(() => {
    const interval = setInterval(() => {
      setBattery((prev) => Math.max(0, prev - Math.random() * 0.5));
      setCredit((prev) => Math.max(0, prev - Math.random() * 100));
      setKuota((prev) => Math.max(0, prev - 0.01));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Loading State agar tidak error 404 saat session belum siap
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Menghubungkan ke Sistem...
      </div>
    );
  }

  const handlePumpToggle = (checked: boolean) => {
    setPumpOn(checked);
    console.log(`MQTT: Pump ${checked ? "ON" : "OFF"}`);
  };

  const handleNavigate = () => {
    // Hanya pindah jika userRole sudah terisi (sawah/kolam)
    if (userRole) {
      router.push(`/${userRole}`);
    } else {
      // Memberikan feedback jika role belum siap
      console.warn("User role belum dimuat, silakan tunggu...");
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 bg-[#fafafa] min-h-screen">
      {/* Header dengan Tombol Logout (Tanpa mengubah layout utama) */}
      <div className="flex justify-between items-center py-6">
        <div className="text-left">
          <h1 className="text-3xl font-bold">Dashboard IoT</h1>
          <p className="text-gray-600">Monitoring pH & Kontrol Pompa</p>
        </div>
        <button
          onClick={() => signOut()}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      {/* System Info - GRADIENT UI TETAP SAMA */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <h2 className="text-xl mb-4 font-semibold">Informasi Sistem</h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Battery Widget */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Battery className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Baterai</span>
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
              <span className="text-sm text-gray-600">Pulsa</span>
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
            <span className="text-sm text-gray-600">Data</span>
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
                <span className="text-green-600 font-bold">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-red-600" />
                <span className="text-red-600 font-bold">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mode Control - LOGIKA FILTER DITERAPKAN DI SINI */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl mb-4 font-semibold">Lahan Saya</h2>
        <div className="grid grid-cols-1 gap-3">
          {userRole === "sawah" && (
            <div className="p-4 rounded-lg border-2 border-green-600 bg-green-50 text-green-700 flex items-center gap-4">
              <div className="text-3xl">🌾</div>
              <div>
                <div className="font-bold">Mode Sawah</div>
                <div className="text-xs opacity-70">Akses Terotorisasi</div>
              </div>
            </div>
          )}

          {userRole === "kolam" && (
            <div className="p-4 rounded-lg border-2 border-cyan-600 bg-cyan-50 text-cyan-700 flex items-center gap-4">
              <div className="text-3xl">🐟</div>
              <div>
                <div className="font-bold">Mode Kolam</div>
                <div className="text-xs opacity-70">Akses Terotorisasi</div>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            // TAMBAHKAN PENJAGA (GUARD) INI
            if (userRole) {
              router.push(`/${userRole}`);
            } else {
              console.warn("Data role belum siap!");
            }
          }}
          // Matikan tombol jika status masih loading atau role kosong
          disabled={isLoading || !userRole}
          className={`w-full mt-4 py-3 bg-gray-800 text-white rounded-lg transition-colors ${
            !userRole || isLoading
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-gray-700"
          }`}
        >
          {isLoading ? "Menghubungkan..." : "Lihat Detail Mode"}
        </button>
      </div>
    </div>
  );
}
