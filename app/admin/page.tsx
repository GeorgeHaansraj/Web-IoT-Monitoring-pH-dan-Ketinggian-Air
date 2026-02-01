"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  ArrowLeft,
  Users,
  Plus,
  Trash2,
  Edit,
  LogOut,
  Battery,
  DollarSign,
  Wifi,
  WifiOff,
  Droplet,
  FlaskConical,
  Waves,
  History,
  Settings,
  Activity,
  Lock,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import WaterLevelMeter from "@/components/visualizations/WaterLevelMeter";
import PHHistoryGraph from "@/components/PHHistoryGraph";

interface User {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

type TabType = "sistem" | "monitoring" | "users";

export default function AdminPage() {
  const router = useRouter();
  const sessionData = useSession();
  const session = sessionData.data;
  const status = sessionData.status;

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin";
  const isLoading = status === "loading";

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("sistem");

  // Device data states
  const [battery, setBattery] = useState(85);
  const [credit, setCredit] = useState(50000);
  const [kuota, setKuota] = useState(4.5);
  const [isOnline, setIsOnline] = useState(true);
  const [rssi, setRssi] = useState(31);
  const [currentPH, setCurrentPH] = useState(7.0);
  const [isPumpOn, setIsPumpOn] = useState(false);
  const [waterLevel, setWaterLevel] = useState(0);
  const [isTogglingPump, setIsTogglingPump] = useState(false); // Loading state for pump toggle

  // User management states
  const [users, setUsers] = useState<User[]>([]);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
  });

  // Pump history states
  const [pumpHistory, setPumpHistory] = useState<any[]>([]);
  const [selectedPumpMode, setSelectedPumpMode] = useState("sawah");

  // Change password states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Auth check
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !session || !isAdmin) {
      router.push("/login");
    }
  }, [status, session, isAdmin, router]);

  // Fetch monitoring data (battery, pH, level) - polling every 5s
  useEffect(() => {
    const fetchMonitoringData = async () => {
      try {
        const response = await fetch(`/api/monitoring-log`);
        if (!response.ok) return;
        const result = await response.json();

        if (result.success && result.data) {
          if (result.data.ph_value !== null) setCurrentPH(result.data.ph_value);
          if (result.data.battery_level !== null)
            setBattery(result.data.battery_level);
          if (result.data.level !== null) setWaterLevel(result.data.level);
          if (result.data.signal_strength !== null)
            setRssi(result.data.signal_strength);
        }
      } catch (error) {
        console.error("[MONITORING] Error fetching data:", error);
      }
    };

    fetchMonitoringData();
    const pollInterval = setInterval(fetchMonitoringData, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  // FEATURE: Fetch pump status on mount and when session changes
  useEffect(() => {
    if (!session?.user) return;

    const fetchPumpStatus = async () => {
      try {
        console.log("[PUMP] Fetching pump status on login/mount...");
        const response = await fetch("/api/pump-relay?mode=sawah");
        if (response.ok) {
          const data = await response.json();
          console.log("[PUMP] Status from DB:", data.isOn);
          setIsPumpOn(data.isOn);
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
          }
        } else if (response.status === 401) {
          console.warn("[PUMP] Session invalid, auto-turning off pump");
          // Auto turn off pump if session invalid
          setIsPumpOn(false);
        }
      } catch (error) {
        console.error("[PUMP] Polling error:", error);
      }
    };

    const pollInterval = setInterval(pollPumpStatus, 10000); // Poll every 10s
    return () => clearInterval(pollInterval);
  }, [session?.user, isPumpOn]);

  // Fetch pump history
  useEffect(() => {
    const fetchPumpHistory = async () => {
      try {
        const response = await fetch(
          `/api/pump-history?mode=${selectedPumpMode}&limit=10&offset=0`,
        );
        if (response.ok) {
          const data = await response.json();
          setPumpHistory(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching pump history:", error);
      }
    };

    fetchPumpHistory();
    const interval = setInterval(fetchPumpHistory, 10000);
    return () => clearInterval(interval);
  }, [selectedPumpMode]);

  // Fetch users
  useEffect(() => {
    if (!isAdmin) return;

    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/admin/users");
        if (response.ok) {
          const data = await response.json();
          if (data.users && Array.isArray(data.users)) {
            setUsers(data.users);
          }
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, [isAdmin]);

  // Battery simulation (dapat diganti dengan data real)
  useEffect(() => {
    const interval = setInterval(() => {
      setBattery((prev) => Math.max(0, prev - Math.random() * 0.5));
      setCredit((prev) => Math.max(0, prev - Math.random() * 100));
      setKuota((prev) => Math.max(0, prev - 0.01));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // pH color helper
  const getPhColor = (ph: number): string => {
    if (ph <= 3) return "#DC2626";
    if (ph <= 6) return `rgb(255, ${Math.round(127 + ((ph - 3) / 3) * 80)}, 0)`;
    if (ph < 7)
      return `rgb(${Math.round(200 - (ph - 6) * 100)}, 200, ${Math.round((ph - 6) * 50)})`;
    if (ph === 7) return "#16A34A";
    if (ph < 8)
      return `rgb(${Math.round(100 - (ph - 7) * 100)}, ${Math.round(200 - (ph - 7) * 50)}, ${Math.round(50 + (ph - 7) * 150)})`;
    return "#3B82F6";
  };

  // RSSI status helper
  const getRssiStatus = (csq: number) => {
    if (csq === 99)
      return {
        status: "Tidak Ada Sinyal",
        color: "text-gray-600",
        bgColor: "bg-gray-100",
      };
    if (csq >= 31)
      return {
        status: "Sangat Baik",
        color: "text-green-600",
        bgColor: "bg-green-100",
      };
    if (csq >= 20)
      return { status: "Baik", color: "text-blue-600", bgColor: "bg-blue-100" };
    if (csq >= 15)
      return {
        status: "Cukup",
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
      };
    if (csq >= 10)
      return {
        status: "Lemah",
        color: "text-orange-600",
        bgColor: "bg-orange-100",
      };
    return {
      status: "Sangat Lemah",
      color: "text-red-600",
      bgColor: "bg-red-100",
    };
  };

  const handleLogout = async () => {
    try {
      // SECURITY: Auto turn-off pump sebelum logout
      if (isPumpOn) {
        console.log("[LOGOUT] Turning off pump before logout...");
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
          if (!response.ok) {
            console.warn("[LOGOUT] Failed to turn off pump, but continuing logout");
          } else {
            console.log("[LOGOUT] Pump turned off successfully");
            setIsPumpOn(false);
          }
        } catch (error) {
          console.error("[LOGOUT] Error turning off pump:", error);
          // Continue logout even if pump control fails
        }
      }

      // Then sign out
      await signOut({ redirect: false });
      toast.success("Logout berhasil. Pompa telah dimatikan.");
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Gagal logout");
    }
  };

  const handleAddUser = () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast.error("Semua field harus diisi");
      return;
    }

    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      username: newUser.username,
      email: newUser.email,
      isActive: true,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setUsers([...users, user]);
    setNewUser({ username: "", email: "", password: "" });
    setShowAddUserForm(false);
    toast.success(`User ${newUser.username} berhasil ditambahkan`);
  };

  const handleDeleteUser = (id: string) => {
    setUsers(users.filter((u) => u.id !== id));
    toast.success("User berhasil dihapus");
  };

  const handleToggleUserStatus = (id: string) => {
    setUsers(
      users.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u)),
    );
  };

  const handleTogglePump = async () => {
    // Prevent multiple simultaneous requests
    if (isTogglingPump) {
      toast.info("Sedang memproses...");
      return;
    }

    try {
      setIsTogglingPump(true); // Start loading

      const response = await fetch("/api/pump-relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "sawah",
          isOn: !isPumpOn,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[PUMP] Toggle response:", data);
        setIsPumpOn(data.data?.isOn ?? !isPumpOn);
        
        // Show appropriate message
        if (data.data?.reason === "timeout") {
          toast.warning(data.message || "Pompa dimatikan (timeout)");
        } else {
          toast.success(data.message || `Pompa ${!isPumpOn ? "dihidupkan" : "dimatikan"}`);
        }
      } else {
        const errorData = await response.json();
        console.error("[PUMP] Error response:", errorData);
        
        if (response.status === 401) {
          toast.error("Session tidak valid. Silakan login kembali.");
        } else if (response.status === 403) {
          toast.error("Anda tidak memiliki akses untuk mengontrol pompa");
        } else {
          toast.error(errorData.error || "Gagal mengontrol pompa");
        }
      }
    } catch (error) {
      console.error("[PUMP] Toggle error:", error);
      toast.error("Gagal mengontrol pompa. Periksa koneksi internet.");
    } finally {
      setIsTogglingPump(false); // Stop loading
    }
  };

  const handleChangePassword = async () => {
    if (
      !changePasswordForm.oldPassword ||
      !changePasswordForm.newPassword ||
      !changePasswordForm.confirmPassword
    ) {
      toast.error("Semua field harus diisi");
      return;
    }

    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      toast.error("Password baru dan konfirmasi tidak cocok");
      return;
    }

    if (changePasswordForm.newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changePasswordForm),
      });

      if (response.ok) {
        toast.success("Password berhasil diubah. Silahkan login kembali");
        setShowChangePassword(false);
        setChangePasswordForm({
          oldPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setTimeout(() => {
          handleLogout();
        }, 1500);
      } else {
        const error = await response.json();
        toast.error(error.error || "Gagal mengubah password");
      }
    } catch (error) {
      toast.error("Gagal mengubah password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Memverifikasi akses admin...</p>
        </div>
      </div>
    );
  }

  const rssiStatus = getRssiStatus(rssi);
  const phColor = getPhColor(currentPH);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-xs text-gray-500">
                Monitoring & Management Sistem
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-200 flex overflow-x-auto items-center justify-between">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab("sistem")}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === "sistem"
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Sistem
            </button>
            <button
              onClick={() => setActiveTab("monitoring")}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === "monitoring"
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Waves className="w-4 h-4 inline mr-2" />
              Monitoring
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === "users"
                  ? "border-blue-600 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Pengguna
            </button>
          </div>
          <button
            onClick={() => setShowChangePassword(true)}
            className="px-4 py-3 font-medium text-sm text-blue-600 hover:bg-blue-50 border-b-2 border-transparent hover:border-blue-200 transition flex items-center gap-1 mr-2"
          >
            <Lock className="w-4 h-4" />
            Ubah Password
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* TAB: SISTEM */}
        {activeTab === "sistem" && (
          <div className="space-y-6">
            {/* Informasi Sistem */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold mb-6">Informasi Sistem</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Battery */}
                <div className="bg-linear-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Battery className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Baterai
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-green-700">
                    {battery.toFixed(1)}%
                  </div>
                  <div className="w-full bg-gray-300 rounded-full h-2 mt-3">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${battery}%` }}
                    />
                  </div>
                </div>

                {/* Pulsa */}
                <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Pulsa
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-blue-700">
                    Rp{(credit / 1000).toFixed(1)}k
                  </div>
                  <div className="text-xs text-gray-600 mt-3">
                    Saldo Tersisa
                  </div>
                </div>

                {/* Data */}
                <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Wifi className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Data
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-purple-700">
                    {kuota.toFixed(2)} GB
                  </div>
                  <div className="text-xs text-gray-600 mt-3">
                    Kuota Tersisa
                  </div>
                </div>
              </div>
            </div>

            {/* Status Koneksi */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold mb-6">Status Koneksi</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {isOnline ? (
                      <Wifi className="w-6 h-6 text-green-600" />
                    ) : (
                      <WifiOff className="w-6 h-6 text-red-600" />
                    )}
                    <span className="font-medium">Perangkat</span>
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      isOnline ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isOnline ? "Terhubung" : "Terputus"}
                  </div>
                </div>

                <div className={`border rounded-lg p-4 ${rssiStatus.bgColor}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <Activity
                      className="w-6 h-6"
                      style={{ color: rssiStatus.color.replace("text-", "") }}
                    />
                    <span className="font-medium">Signal Kualitas (RSSI)</span>
                  </div>
                  <div className={`text-2xl font-bold ${rssiStatus.color}`}>
                    {rssiStatus.status}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    CSQ: {rssi}/31
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: MONITORING */}
        {activeTab === "monitoring" && (
          <div className="space-y-6">
            {/* pH Monitoring */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* pH Real-time */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FlaskConical className="w-5 h-5" />
                  pH Real-time (Sawah)
                </h3>
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ backgroundColor: phColor, opacity: 0.2 }}
                    >
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: phColor }}
                      >
                        <span className="text-3xl font-bold text-white">
                          {currentPH.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm">Kondisi Normal</p>
                  </div>
                </div>
              </div>

              {/* Water Level */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Droplet className="w-5 h-5" />
                  Tinggi Permukaan Air
                </h3>
                <WaterLevelMeter level={waterLevel} />
              </div>
            </div>

            {/* Kontrol Pompa */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold mb-4">Kontrol Pompa</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Pompa Sawah</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Status: {isPumpOn ? "Aktif" : "Nonaktif"}
                      </p>
                      {isTogglingPump && (
                        <p className="text-xs text-blue-600 mt-2 font-medium">
                          ⏳ Sedang memproses...
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={isPumpOn}
                      onCheckedChange={handleTogglePump}
                      disabled={isTogglingPump}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* pH History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold mb-4">Riwayat pH</h3>
              <PHHistoryGraph />
            </div>

            {/* Riwayat Pompa - Khusus Admin */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                Riwayat Kontrol Pompa
              </h3>

              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setSelectedPumpMode("sawah")}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    selectedPumpMode === "sawah"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Sawah
                </button>
                <button
                  onClick={() => setSelectedPumpMode("kolam")}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    selectedPumpMode === "kolam"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Kolam
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Waktu
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Dari
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Akun Admin
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pumpHistory.length > 0 ? (
                      pumpHistory.map((history, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs">
                            {new Date(history.timestamp).toLocaleString(
                              "id-ID",
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                history.newState
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {history.newState ? "ON" : "OFF"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className="px-2 py-1 bg-gray-100 rounded">
                              {history.changedBy}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {history.user ? (
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {history.user.name || "N/A"}
                                </span>
                                <span className="text-gray-500">
                                  {history.user.email}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          Belum ada riwayat kontrol pompa
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PENGGUNA */}
        {activeTab === "users" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Daftar Pengguna</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Total {users.length} pengguna terdaftar
                </p>
              </div>
              <button
                onClick={() => setShowAddUserForm(!showAddUserForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tambah User
              </button>
            </div>

            {showAddUserForm && (
              <div className="p-6 bg-blue-50 border-b border-blue-200">
                <h3 className="font-bold mb-4">Tambah Pengguna Baru</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Username"
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser({ ...newUser, username: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                  />
                  <Input
                    placeholder="Password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    className="md:col-span-2"
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleAddUser}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setShowAddUserForm(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Bergabung
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{user.username}</td>
                      <td className="px-6 py-4 text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <Switch
                          checked={user.isActive}
                          onCheckedChange={() =>
                            handleToggleUserStatus(user.id)
                          }
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.createdAt}
                      </td>
                      <td className="px-6 py-4 flex justify-center gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded text-blue-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 hover:bg-red-100 rounded text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: KEAMANAN */}
        {/* Removed - replaced with modal dialog */}
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-1">Ubah Password</h2>
            <p className="text-sm text-gray-600 mb-6">
              Masukkan password lama dan password baru Anda
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password Lama
                </label>
                <Input
                  type="password"
                  placeholder="Masukkan password lama"
                  value={changePasswordForm.oldPassword}
                  onChange={(e) =>
                    setChangePasswordForm({
                      ...changePasswordForm,
                      oldPassword: e.target.value,
                    })
                  }
                  disabled={isChangingPassword}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password Baru
                </label>
                <Input
                  type="password"
                  placeholder="Masukkan password baru"
                  value={changePasswordForm.newPassword}
                  onChange={(e) =>
                    setChangePasswordForm({
                      ...changePasswordForm,
                      newPassword: e.target.value,
                    })
                  }
                  disabled={isChangingPassword}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Konfirmasi Password Baru
                </label>
                <Input
                  type="password"
                  placeholder="Konfirmasi password baru"
                  value={changePasswordForm.confirmPassword}
                  onChange={(e) =>
                    setChangePasswordForm({
                      ...changePasswordForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  disabled={isChangingPassword}
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setChangePasswordForm({
                    oldPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
                disabled={isChangingPassword}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isChangingPassword ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </>
                ) : (
                  "Ubah Password"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
