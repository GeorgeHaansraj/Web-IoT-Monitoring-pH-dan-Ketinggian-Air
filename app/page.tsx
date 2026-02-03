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
  Fish,
  Sprout,
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
  const [isOnline, setIsOnline] = useState(true);
  const [rssi, setRssi] = useState(31); // CSQ value 0-31, 99 for no signal
  const [currentPH, setCurrentPH] = useState(7.0);
  const [isPumpOn, setIsPumpOn] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [waterLevel, setWaterLevel] = useState(0);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [isTogglingPump, setIsTogglingPump] = useState(false);
  const [lastDataTimestamp, setLastDataTimestamp] = useState<number>(
    Date.now(),
  );

  // Message States
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // TIMEOUT_THRESHOLD: jika tidak ada data dalam 60 detik, dinyatakan offline
  const TIMEOUT_THRESHOLD = 60000; // 60 detik

  // FEATURE: Polling otomatis untuk cek status device
  // Termasuk timeout detection berdasarkan timestamp data terbaru
  useEffect(() => {
    const checkDeviceStatus = async () => {
      try {
        const response = await fetch("/api/device-status");
        if (!response.ok) {
          console.warn("[STATUS] Failed to fetch device status");
          setIsOnline(false);
          return;
        }
        const data = await response.json();

        // Jika ada data dan baru-baru ini (< timeout threshold), set online
        if (data && data.last_update) {
          const lastUpdateTime = new Date(data.last_update).getTime();
          const timeSinceLastUpdate = Date.now() - lastUpdateTime;

          if (timeSinceLastUpdate < TIMEOUT_THRESHOLD) {
            console.log(
              `[STATUS] Device online (last update: ${timeSinceLastUpdate}ms ago)`,
            );
            setIsOnline(true);
          } else {
            console.warn(
              `[STATUS] Device timeout (no data for ${timeSinceLastUpdate}ms)`,
            );
            setIsOnline(false);
          }
        } else {
          setIsOnline(false);
        }
      } catch (error) {
        console.error("[STATUS] Error checking device status:", error);
        setIsOnline(false);
      }
    };

    // Check immediately on mount
    checkDeviceStatus();

    // Then poll every 10 seconds
    const statusInterval = setInterval(checkDeviceStatus, 10000);
    return () => clearInterval(statusInterval);
  }, []);

  // FEATURE: Fetch all monitoring data (battery, pH, level) from monitoring_log
  // Also tracks timestamp and updates online status based on timeout
  useEffect(() => {
    const fetchMonitoringData = async () => {
      try {
        const response = await fetch(`/api/monitoring-log`);
        if (!response.ok) {
          console.error(`[MONITORING] API error: HTTP ${response.status}`);
          const errorData = await response.json().catch(() => ({}));
          console.error("[MONITORING] Error details:", errorData);
          setIsOnline(false);
          return;
        }
        const result = await response.json();

        if (result.success && result.data) {
          // Update timestamp ketika berhasil fetch data baru
          const dataTimestamp = Date.now();
          setLastDataTimestamp(dataTimestamp);
          console.log(
            `[MONITORING] Data received at ${new Date(dataTimestamp).toLocaleTimeString()}`,
          );

          // Set online jika data baru berhasil didapat
          setIsOnline(true);

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
        } else {
          setIsOnline(false);
        }
      } catch (error) {
        console.error(`[MONITORING] Error fetching data:`, error);
        setIsOnline(false);
      }
    };

    fetchMonitoringData();

    // Setup polling interval: update setiap 5 detik
    const pollInterval = setInterval(() => {
      fetchMonitoringData();
    }, 5000);

    // Timeout detector: check setiap 30 detik jika data sudah stale
    const timeoutCheckInterval = setInterval(() => {
      const timeSinceLastData = Date.now() - lastDataTimestamp;
      if (timeSinceLastData > TIMEOUT_THRESHOLD) {
        console.warn(
          `[MONITORING] No data for ${timeSinceLastData}ms, setting offline`,
        );
        setIsOnline(false);
      }
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(timeoutCheckInterval);
    };
  }, [lastDataTimestamp, TIMEOUT_THRESHOLD]);

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

  // FEATURE: Realtime polling pump status every 5s to sync UI with DB and all users
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

    // Also poll device-control to check for command expiry (2-hour timeout safety)
    const pollCommandState = async () => {
      try {
        const response = await fetch("/api/device-control?mode=sawah");
        if (response.ok) {
          const data = await response.json();
          // IMPORTANT: If command is expired (age > 2 hours), database returns OFF
          // This ensures UI button resets even if user forgets or manually set ON
          if (data.command === "OFF" && isPumpOn) {
            console.warn(
              `[COMMAND] State expired (age: ${data.age_seconds}s), resetting UI to OFF`,
            );
            setIsPumpOn(false);
            setIsManualMode(false);
          }
        }
      } catch (error) {
        // Silent fail - this is just for safety monitoring
        console.debug("[COMMAND] Expiry check error:", error);
      }
    };

    const pollInterval = setInterval(() => {
      pollPumpStatus();
      pollCommandState();
    }, 5000); // Poll every 5s for faster sync

    return () => clearInterval(pollInterval);
  }, [session?.user, isPumpOn]);

  // Simulasi real-time untuk baterai dan RSSI
  useEffect(() => {
    const interval = setInterval(() => {
      setBattery((prev) => Math.max(0, prev - Math.random() * 0.5));

      // Simulasi RSSI yang berubah-ubah (untuk testing, nanti bisa diganti dengan data real)
      const possibleRssi = [31, 25, 22, 18, 16, 12, 8, 5, 2, 0, 99];
      setRssi(possibleRssi[Math.floor(Math.random() * possibleRssi.length)]);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // FEATURE: Fetch admin messages
  useEffect(() => {
    if (!session?.user) return;

    const fetchMessages = async () => {
      try {
        const response = await fetch("/api/user/messages");
        if (response.ok) {
          const data = await response.json();
          setAdminMessages(data.data || []);
          setUnreadCount(data.unreadCount || 0);
          console.log("[MESSAGES] Fetched:", data.data?.length, "messages");
        }
      } catch (error) {
        console.error("[MESSAGES] Error fetching:", error);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [session?.user]);

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

  // Function to determine battery color based on level
  const getBatteryColor = (
    level: number,
  ): {
    bg: string;
    border: string;
    icon: string;
    text: string;
    bar: string;
  } => {
    if (level >= 75) {
      // Green - Good
      return {
        bg: "bg-gradient-to-br from-green-50 to-emerald-100",
        border: "border-green-300",
        icon: "text-green-600",
        text: "text-green-700",
        bar: "bg-gradient-to-r from-green-500 to-emerald-600",
      };
    } else if (level >= 50) {
      // Yellow - Warning
      return {
        bg: "bg-gradient-to-br from-yellow-50 to-amber-100",
        border: "border-yellow-300",
        icon: "text-yellow-600",
        text: "text-yellow-700",
        bar: "bg-gradient-to-r from-yellow-500 to-amber-600",
      };
    } else {
      // Red - Critical
      return {
        bg: "bg-gradient-to-br from-red-50 to-orange-100",
        border: "border-red-300",
        icon: "text-red-600",
        text: "text-red-700",
        bar: "bg-gradient-to-r from-red-500 to-orange-600",
      };
    }
  };

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

  // Determine Kolam Ikan block color based on pH
  const getKolamBlockColor = (ph: number): { border: string; bg: string } => {
    if (ph < 4.0 || ph > 9.5) {
      // Danger - Red
      return { border: "border-red-400", bg: "bg-red-100" };
    } else if ((ph >= 4.0 && ph < 6.5) || (ph > 8.5 && ph <= 9.5)) {
      // Warning - Orange/Yellow
      return { border: "border-yellow-400", bg: "bg-yellow-50" };
    } else {
      // Optimal - Green
      return { border: "border-green-400", bg: "bg-green-50" };
    }
  };

  // Function to determine Sawah Padi block color based on pH
  const getSawahBlockColor = (ph: number): { border: string; bg: string } => {
    if (ph < 4.5 || ph > 8.0) {
      // Danger/Warning - Red or Orange
      return ph > 8.0
        ? { border: "border-orange-400", bg: "bg-orange-50" }
        : { border: "border-red-400", bg: "bg-red-100" };
    } else if ((ph >= 4.5 && ph < 5.5) || (ph > 7.0 && ph <= 8.0)) {
      // Caution - Yellow/Orange
      return { border: "border-yellow-400", bg: "bg-yellow-50" };
    } else {
      // Optimal - Green
      return { border: "border-green-400", bg: "bg-green-50" };
    }
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

  const handleMarkMessageAsRead = async (messageId: string) => {
    try {
      const response = await fetch("/api/user/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });

      if (response.ok) {
        setAdminMessages(
          adminMessages.map((msg) =>
            msg.id === messageId
              ? { ...msg, isRead: true, readAt: new Date().toISOString() }
              : msg,
          ),
        );
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error("[MESSAGES] Error marking as read:", error);
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

      {/* Admin Messages */}
      {adminMessages.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-blue-200 bg-blue-50">
          <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
            💬 Pesan dari Administrator
            {unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
          </h3>

          <div className="space-y-3">
            {adminMessages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg border-l-4 ${message.isRead
                  ? "bg-white border-gray-300"
                  : "bg-blue-100 border-blue-600"
                  }`}
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <p
                    className={`text-sm font-semibold ${message.isRead ? "text-gray-600" : "text-blue-900"
                      }`}
                  >
                    {new Date(message.createdAt).toLocaleString("id-ID")}
                  </p>
                  {!message.isRead && (
                    <button
                      onClick={() => handleMarkMessageAsRead(message.id)}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition"
                    >
                      Tandai dibaca
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                  {message.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Info */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4 border border-gray-100">
        <h2 className="text-xl mb-4 font-semibold">Informasi Sistem</h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Battery Widget */}
          <div
            className={`rounded-lg p-5 border flex flex-col items-center justify-center ${getBatteryColor(battery).bg} ${getBatteryColor(battery).border}`}
          >
            {/* V                                                                                   isual Battery Icon */}
            <div className="relative mb-4">
              {/* Battery outline */}
              <div className="w-16 h-9 border-2 rounded border-gray-400 flex items-center px-1">
                {/* Battery fill */}
                <div
                  className={`h-full rounded transition-all ${getBatteryColor(battery).bar}`}
                  style={{ width: `${battery}%` }}
                ></div>
              </div>
              {/* Battery terminal */}
              <div className="absolute -right-1.5 top-1/2 transform -translate-y-1/2 w-1.5 h-3.5 bg-gray-400 rounded-r"></div>
            </div>

            {/* Percentage Text */}
            <div
              className={`text-3xl font-bold ${getBatteryColor(battery).text} mb-1`}
            >
              {battery.toFixed(0)}%
            </div>

            {/* Label */}
            <p className="text-xs text-gray-600 font-medium">Baterai</p>
          </div>

          {/* Connection Status */}
          <div
            className={`rounded-lg p-5 border flex flex-col items-center justify-center transition-all ${isOnline
              ? "bg-gradient-to-br from-cyan-50 to-blue-100 border-blue-300"
              : "bg-gradient-to-br from-orange-50 to-red-100 border-red-300"
              }`}
          >
            {/* Icon */}
            <div className="mb-3">
              {isOnline ? (
                <Wifi className="w-8 h-8 text-blue-600" />
              ) : (
                <WifiOff className="w-8 h-8 text-red-600" />
              )}
            </div>

            {/* Status Badge */}
            <div className="mb-3">
              <span
                className={`text-sm font-bold px-3 py-1.5 rounded-full transition-all ${isOnline
                  ? "bg-green-200 text-green-700"
                  : "bg-red-200 text-red-700"
                  }`}
              >
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>

            {/* CSQ Info */}
            <div
              className={`px-3 py-2 rounded-lg text-xs font-bold mb-2 ${getRssiStatus(rssi).bgColor} ${getRssiStatus(rssi).color}`}
            >
              <div className="flex flex-col items-center gap-1">
                <span>CSQ: {rssi}</span>
                <span className="text-xs">{getRssiStatus(rssi).status}</span>
              </div>
            </div>

            {/* Label */}
            <p className="text-xs text-gray-600 font-medium">Sinyal</p>
          </div>
        </div>
      </div>

      {/* Status Lahan Section */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-xl font-semibold">Status Lahan</h2>
        </div>

        <div className="space-y-4">
          {/* KOLAM IKAN Block */}
          <div
            className={`border-2 rounded-lg p-5 ${getKolamBlockColor(currentPH).border} ${getKolamBlockColor(currentPH).bg}`}
          >
            <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
              <Fish className="w-5 h-5" />
              Kolam Ikan
            </h3>

            {/* Determine Kolam status and recommendations */}
            {currentPH < 4.0 ? (
              <div className="space-y-3">
                <div className="bg-red-100 border border-red-300 rounded p-3">
                  <p className="text-sm font-bold text-red-700 mt-1">
                    Bahaya: Ikan Mati
                  </p>
                  <p className="text-sm text-red-800 mt-2">
                    💡 <span className="font-semibold">Tindakan:</span> Kuras &
                    Ganti Air Total
                  </p>
                </div>
              </div>
            ) : currentPH >= 4.0 && currentPH < 6.5 ? (
              <div className="space-y-3">
                <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
                  <p className="text-sm font-bold text-yellow-700 mt-1">
                    Air Asam
                  </p>
                  <p className="text-sm text-yellow-800 mt-2">
                    💡 <span className="font-semibold">Tindakan:</span> Lakukan
                    Pengapuran
                  </p>
                </div>
              </div>
            ) : currentPH >= 6.5 && currentPH <= 8.5 ? (
              <div className="space-y-3">
                <div className="bg-green-100 border border-green-300 rounded p-3">
                  <p className="text-sm font-bold text-green-700 mt-1">
                    ✓ pH Optimal
                  </p>
                  <p className="text-sm text-green-800 mt-2">
                    💡 <span className="font-semibold">Tindakan:</span>{" "}
                    Pertahankan Kondisi
                  </p>
                </div>
              </div>
            ) : currentPH > 8.5 && currentPH <= 9.5 ? (
              <div className="space-y-3">
                <div className="bg-orange-100 border border-orange-300 rounded p-3">
                  <p className="text-sm font-bold text-orange-700 mt-1">
                    Air Basa
                  </p>
                  <p className="text-sm text-orange-800 mt-2">
                    💡 <span className="font-semibold">Tindakan:</span> Tambah
                    Air Tawar
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-red-100 border border-red-300 rounded p-3">
                  <p className="text-sm font-bold text-red-700 mt-1">
                    Bahaya: Ikan Stres
                  </p>
                  <p className="text-sm text-red-800 mt-2">
                    💡 <span className="font-semibold">Tindakan:</span>{" "}
                    Netralisir Segera
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* SAWAH PADI Block */}
          <div
            className={`border-2 rounded-lg p-5 ${getSawahBlockColor(currentPH).border} ${getSawahBlockColor(currentPH).bg}`}
          >
            <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
              <Sprout className="w-5 h-5" />
              Sawah Padi
            </h3>

            {/* Determine Sawah status and recommendations */}
            {currentPH < 4.5 ? (
              <div className="space-y-3">
                <div className="bg-red-100 border border-red-300 rounded p-3">
                  <p className="text-sm font-bold text-red-700 mt-1">
                    Sangat Asam
                  </p>
                  <p className="text-sm text-red-800 mt-2">
                    💡 <span className="font-semibold">Tindakan:</span> Kapur
                    Dosis Tinggi
                  </p>
                </div>
              </div>
            ) : currentPH >= 4.5 && currentPH < 5.5 ? (
              <div className="space-y-3">
                <div className="bg-orange-100 border border-orange-300 rounded p-3">
                  <p className="text-sm font-bold text-orange-700 mt-1">
                    Kurang Subur
                  </p>
                  <p className="text-sm text-orange-800 mt-2">
                    💡 <span className="font-semibold">Tindakan:</span> Tabur
                    Dolomit
                  </p>
                </div>
              </div>
            ) : currentPH >= 5.5 && currentPH <= 7.0 ? (
              <div className="space-y-3">
                <div className="bg-green-100 border border-green-300 rounded p-3">
                  <p className="text-sm font-bold text-green-700 mt-1">
                    ✓ pH Optimal
                  </p>
                  <p className="text-sm text-green-800 mt-2">
                    💡 <span className="font-semibold">Tindakan:</span> Lanjut
                    Pemupukan
                  </p>
                </div>
              </div>
            ) : currentPH > 7.0 && currentPH <= 8.0 ? (
              <div className="space-y-3">
                <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
                  <p className="text-sm font-bold text-yellow-700 mt-1">
                    Sedikit Basa
                  </p>
                  <p className="text-sm text-yellow-800 mt-2">
                    💡 <span className="font-semibold">Tindakan:</span> Beri
                    Pupuk ZA
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-orange-100 border border-orange-300 rounded p-3">
                  <p className="text-sm font-bold text-orange-700 mt-1">
                    Terlalu Basa
                  </p>
                  <p className="text-sm text-orange-800 mt-2">
                    💡 <span className="font-semibold">Tindakan:</span> Drainase
                    & Cuci Lahan
                  </p>
                </div>
              </div>
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

        {/* Kontrol Pompa Toggle*/}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Droplet
                className={`w-6 h-6 ${isPumpOn ? "text-blue-600" : "text-gray-400"
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
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors px-1 p-3 ${isPumpOn ? "bg-blue-600" : "bg-gray-300"
                }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isPumpOn ? "translate-x-6" : "translate-x-0"
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
