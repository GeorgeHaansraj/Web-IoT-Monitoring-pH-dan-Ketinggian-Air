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
import { PumpDurationModal } from "@/components/PumpDurationModal";

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
  const [rssi, setRssi] = useState(31); // CSQ value 0-31, 99 for no signal
  const [currentPH, setCurrentPH] = useState(7.0);
  const [isPumpOn, setIsPumpOn] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [waterLevel, setWaterLevel] = useState(0);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [isTogglingPump, setIsTogglingPump] = useState(false);

  // Fetch device status from database on mount
  useEffect(() => {
    const fetchDeviceStatus = async () => {
      try {
        const response = await fetch("/api/device-status");
        if (!response.ok) return;
        const data = await response.json();

        // Update online status and other device-specific data
        if (data) {
          setIsOnline(true);
        }
      } catch (error) {
        console.error("Error fetching device status:", error);
        setIsOnline(false);
      }
    };

    fetchDeviceStatus();
  }, []);

  // Fetch all monitoring data (battery, pH, level) from monitoring_log
  useEffect(() => {
    const fetchMonitoringData = async () => {
      try {
        const response = await fetch(`/api/monitoring-log`);
        if (!response.ok) {
          console.error(`[MONITORING] API error: HTTP ${response.status}`);
          const errorData = await response.json().catch(() => ({}));
          console.error("[MONITORING] Error details:", errorData);
          return;
        }
        const result = await response.json();

        if (result.success && result.data) {
          // Update pH
          if (
            result.data.ph_value !== null &&
            result.data.ph_value !== undefined
          ) {
            setCurrentPH(result.data.ph_value);
            console.log(`[MONITORING] Updated pH: ${result.data.ph_value}`);
          }

          // Update battery level
          if (
            result.data.battery_level !== null &&
            result.data.battery_level !== undefined
          ) {
            setBattery(result.data.battery_level);
            console.log(
              `[MONITORING] Updated battery: ${result.data.battery_level}%`,
            );
          }

          // Update water level (level column from monitoring_logs)
          if (result.data.level !== null && result.data.level !== undefined) {
            setWaterLevel(result.data.level);
            console.log(`[MONITORING] Updated level: ${result.data.level}cm`);
          }

          // Update signal strength if available
          if (
            result.data.signal_strength !== null &&
            result.data.signal_strength !== undefined
          ) {
            setRssi(result.data.signal_strength);
            console.log(
              `[MONITORING] Updated signal: ${result.data.signal_strength}`,
            );
          }
        }
      } catch (error) {
        console.error(`[MONITORING] Error fetching data:`, error);
      }
    };

    fetchMonitoringData();

    // Setup polling interval: update setiap 5 detik
    const pollInterval = setInterval(() => {
      fetchMonitoringData();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, []);

  // FEATURE: Fetch pump status on login to sync UI with database
  useEffect(() => {
    if (!session?.user) return;

    const fetchPumpStatus = async () => {
      try {
        console.log("[PUMP] Fetching pump status on login...");
        const response = await fetch("/api/pump-relay?mode=sawah");
        if (response.ok) {
          const data = await response.json();
          console.log("[PUMP] Status from DB:", data.isOn);
          setIsPumpOn(data.isOn);
          setIsManualMode(data.isManualMode ?? false);
        }
      } catch (error) {
        console.error("[PUMP] Error fetching pump status:", error);
      }
    };

    // Fetch immediately on login
    fetchPumpStatus();
  }, [session?.user]);

  // FEATURE: Realtime polling pump status every 10s to sync UI with DB
  useEffect(() => {
    if (!session?.user) return;

    const pollPumpStatus = async () => {
      try {
        const response = await fetch("/api/pump-relay?mode=sawah");
        if (response.ok) {
          const data = await response.json();
          // Update UI if status changed in database
          if (data.isOn !== isPumpOn) {
            console.log("[PUMP] Status changed in DB, updating UI:", data.isOn);
            setIsPumpOn(data.isOn);
            setIsManualMode(data.isManualMode ?? false);
          }
        } else if (response.status === 401) {
          console.warn("[PUMP] Session invalid");
          setIsPumpOn(false);
        }
      } catch (error) {
        console.error("[PUMP] Polling error:", error);
      }
    };

    const pollInterval = setInterval(pollPumpStatus, 10000); // Poll every 10s
    return () => clearInterval(pollInterval);
  }, [session?.user, isPumpOn]);

  // Simulasi real-time untuk baterai, pulsa, kuota, dan RSSI
  useEffect(() => {
    const interval = setInterval(() => {
      setBattery((prev) => Math.max(0, prev - Math.random() * 0.5));
      setCredit((prev) => Math.max(0, prev - Math.random() * 100));
      setKuota((prev) => Math.max(0, prev - 0.01));

      // Simulasi RSSI yang berubah-ubah (untuk testing, nanti bisa diganti dengan data real)
      const possibleRssi = [31, 25, 22, 18, 16, 12, 8, 5, 2, 0, 99];
      setRssi(possibleRssi[Math.floor(Math.random() * possibleRssi.length)]);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle page unload for manual mode pump auto-OFF
  useEffect(() => {
    if (!isPumpOn) return; // Only add listener if pump is ON

    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      // Fetch pump status to check if it's in manual mode
      try {
        const statusResponse = await fetch("/api/pump-relay?mode=sawah");
        if (statusResponse.ok) {
          const pumpData = await statusResponse.json();
          // Only auto-OFF if in manual mode
          if (pumpData.isManualMode) {
            // Use keepalive to ensure the request completes even during page unload
            await fetch("/api/pump-relay", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                mode: "sawah",
                isOn: false,
                changedBy: "auto-page-leave",
              }),
              keepalive: true,
            });
          }
        }
      } catch (error) {
        console.error("[PUMP] Error during beforeunload:", error);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isPumpOn]);

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

  // Function to determine RSSI status based on CSQ value
  const getRssiStatus = (
    csq: number,
  ): { status: string; quality: string; color: string; bgColor: string } => {
    if (csq === 99) {
      return {
        status: "Tidak Ada Sinyal",
        quality: "N/A",
        color: "text-gray-600",
        bgColor: "bg-gray-100",
      };
    } else if (csq >= 31) {
      return {
        status: "Sangat Baik",
        quality: "Excellent",
        color: "text-green-600",
        bgColor: "bg-green-100",
      };
    } else if (csq >= 20) {
      return {
        status: "Baik",
        quality: "Good",
        color: "text-blue-600",
        bgColor: "bg-blue-100",
      };
    } else if (csq >= 15) {
      return {
        status: "Cukup",
        quality: "Fair",
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
      };
    } else if (csq >= 10) {
      return {
        status: "Lemah",
        quality: "Weak",
        color: "text-orange-600",
        bgColor: "bg-orange-100",
      };
    } else if (csq >= 2) {
      return {
        status: "Sangat Lemah",
        quality: "Marginal",
        color: "text-red-600",
        bgColor: "bg-red-100",
      };
    } else {
      return {
        status: "Hampir Putus",
        quality: "Critical",
        color: "text-red-700",
        bgColor: "bg-red-200",
      };
    }
  };

  const handleLogout = async () => {
    try {
      // If pump is ON in manual mode, auto-OFF before logout
      if (isPumpOn && isManualMode) {
        console.log("[LOGOUT] Auto-turning off manual mode pump...");
        try {
          const response = await fetch("/api/pump-relay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "sawah",
              isOn: false,
              changedBy: "auto-logout",
            }),
          });

          if (response.ok) {
            console.log("[LOGOUT] Pump turned off successfully");
            setIsPumpOn(false);
            setIsManualMode(false);
          } else {
            console.warn("[LOGOUT] Failed to turn off pump, but continuing");
          }

          // Small delay to ensure request completes
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error("[LOGOUT] Error turning off pump:", error);
          // Continue logout even if pump control fails
        }
      }

      // Sign out
      await signOut({ redirect: false });
      toast.success("Logout berhasil");
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Gagal logout");
    }
  };

  const handlePumpToggle = async (checked: boolean) => {
    // If turning pump ON, show duration modal first
    if (checked) {
      setShowDurationModal(true);
      return;
    }

    // If turning pump OFF, do it directly
    await handlePumpToggleWithDuration(null, false);
  };

  const handlePumpToggleWithDuration = async (
    duration: number | null,
    isManualMode: boolean,
  ) => {
    if (isTogglingPump) {
      toast.info("Sedang memproses...");
      return;
    }

    const isOn = !isPumpOn;
    setIsTogglingPump(true);
    setIsPumpOn(isOn);

    try {
      const response = await fetch("/api/pump-relay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "sawah",
          isOn: isOn,
          changedBy: "dashboard",
          duration: duration,
          isManualMode: isManualMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
          toast.error("Session tidak valid. Silakan login kembali.");
          router.push("/login");
          return;
        }

        throw new Error(
          errorData.error || "Gagal mengirim status pompa ke server",
        );
      }

      const data = await response.json();

      // Store manual mode state
      if (isOn) {
        setIsManualMode(isManualMode);
      }

      if (isOn) {
        const modeText = isManualMode
          ? "(Manual)"
          : duration
            ? `(${duration} jam)`
            : "";
        toast("Pompa air dihidupkan " + modeText, {
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

      console.log(`HTTP: Pump ${isOn ? "ON" : "OFF"} - Response:`, data);
    } catch (error) {
      console.error("Error sending pump status:", error);
      setIsPumpOn(!isOn);
      toast.error(
        error instanceof Error ? error.message : "Gagal mengontrol pompa",
      );
    } finally {
      setIsTogglingPump(false);
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
            onClick={handleLogout}
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
          <div className="bg-linear-to-br from-green-50 to-green-100 rounded-lg p-4">
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
          <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-lg p-4">
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
        <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-lg p-4">
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
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status Koneksi</span>
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${getRssiStatus(rssi).bgColor} ${getRssiStatus(rssi).color}`}
            >
              <div className="flex items-center gap-1">
                <span className="font-bold">{rssi}</span>
                <span>|</span>
                <span>{getRssiStatus(rssi).status}</span>
              </div>
            </div>
            <span
              className={`font-bold text-sm ${isOnline ? "text-green-600" : "text-red-600"}`}
            >
              {isOnline ? "Online" : "Offline"}
            </span>
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

        {/* Kontrol Pompa Toggle*/}
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

      {/* Pump Duration Modal */}
      <PumpDurationModal
        isOpen={showDurationModal}
        onClose={() => setShowDurationModal(false)}
        onSelect={handlePumpToggleWithDuration}
        isLoading={isTogglingPump}
      />
    </div>
  );
}
