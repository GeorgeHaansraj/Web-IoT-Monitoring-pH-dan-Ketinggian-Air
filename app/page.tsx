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

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Menghubungkan ke Sistem...
      </div>
    );
  }

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
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
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

      {/* Mode Control */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
        <h2 className="text-xl mb-4 font-semibold">Lahan Saya</h2>
        <div className="grid grid-cols-1 gap-3">
          {userRole === "sawah" && (
            <div className="p-4 rounded-lg border-2 border-green-600 bg-green-50 text-green-700 flex items-center gap-4">
              <div className="text-3xl">🌾</div>
              <div>
                <div className="font-bold">Mode Sawah</div>
                <div className="text-xs opacity-70 italic">
                  Akses Terotorisasi
                </div>
              </div>
            </div>
          )}

          {userRole === "kolam" && (
            <div className="p-4 rounded-lg border-2 border-cyan-600 bg-cyan-50 text-cyan-700 flex items-center gap-4">
              <div className="text-3xl">🐟</div>
              <div>
                <div className="font-bold">Mode Kolam</div>
                <div className="text-xs opacity-70 italic">
                  Akses Terotorisasi
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            if (userRole) {
              router.push(`/${userRole}`);
            } else {
              console.warn("Data role belum siap!");
            }
          }}
          disabled={isLoading || !userRole}
          className={`w-full mt-4 py-4 bg-gray-800 text-white rounded-xl font-bold transition-all shadow-md ${
            !userRole || isLoading
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-gray-700 hover:shadow-lg active:scale-95"
          }`}
        >
          {isLoading ? "Menghubungkan..." : "Lihat Detail Mode"}
        </button>
      </div>
    </div>
  );
}
