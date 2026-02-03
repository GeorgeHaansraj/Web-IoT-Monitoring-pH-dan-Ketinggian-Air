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
  Fish,
  Sprout,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import WaterLevelMeter from "@/components/visualizations/WaterLevelMeter";
import PHHistoryGraph from "@/components/PHHistoryGraph";
import { PumpDurationModal } from "@/components/PumpDurationModal";

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
  const [isOnline, setIsOnline] = useState(true);
  const [rssi, setRssi] = useState(31);
  const [currentPH, setCurrentPH] = useState(7.0);
  const [isPumpOn, setIsPumpOn] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [waterLevel, setWaterLevel] = useState(0);
  const [isTogglingPump, setIsTogglingPump] = useState(false); // Loading state for pump toggle
  const [showDurationModal, setShowDurationModal] = useState(false); // Modal for pump duration selection

  // User management states
  const [users, setUsers] = useState<User[]>([]);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedUserForMessage, setSelectedUserForMessage] =
    useState<User | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isTogglingUserStatus, setIsTogglingUserStatus] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Pump history states
  const [pumpHistory, setPumpHistory] = useState<any[]>([]);

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
          console.warn("[PUMP] Session invalid, auto-turning off pump");
          // Auto turn off pump if session invalid
          setIsPumpOn(false);
        }
      } catch (error) {
        console.error("[PUMP] Polling error:", error);
      }
    };

    const pollInterval = setInterval(pollPumpStatus, 5000); // Poll every 5s for faster sync
    return () => clearInterval(pollInterval);
  }, [session?.user, isPumpOn]);

  // Fetch pump history
  useEffect(() => {
    const fetchPumpHistory = async () => {
      try {
        const response = await fetch(`/api/pump-history?limit=20&offset=0`);
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
  }, []);

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

  // pH text color for Tailwind (untuk status description)
  const getPhTextStatus = (ph: number): string => {
    if (ph < 4) return "Sangat Asam";
    if (ph < 6) return "Asam";
    if (ph < 7) return "Sedikit Asam";
    if (ph === 7) return "Netral (Optimal)";
    if (ph < 8) return "Sedikit Basa";
    if (ph < 10) return "Basa";
    return "Sangat Basa";
  };

  // Helper function untuk status Kolam Ikan berdasarkan pH
  const getKolamBlockColor = (ph: number): { border: string; bg: string } => {
    if (ph < 4.0 || ph > 9.5) {
      return { border: "border-red-300", bg: "bg-red-50" };
    } else if ((ph >= 4.0 && ph < 6.5) || (ph > 8.5 && ph <= 9.5)) {
      return { border: "border-amber-300", bg: "bg-amber-50" };
    } else {
      return { border: "border-emerald-300", bg: "bg-emerald-50" };
    }
  };

  // Helper function untuk status Sawah berdasarkan pH
  const getSawahBlockColor = (ph: number): { border: string; bg: string } => {
    if (ph < 4.5 || ph > 8.0) {
      return ph > 8.0
        ? { border: "border-amber-300", bg: "bg-amber-50" }
        : { border: "border-red-300", bg: "bg-red-50" };
    } else if ((ph >= 4.5 && ph < 5.5) || (ph > 7.0 && ph <= 8.0)) {
      return { border: "border-yellow-300", bg: "bg-yellow-50" };
    } else {
      return { border: "border-emerald-300", bg: "bg-emerald-50" };
    }
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

  const handleDeleteUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    // Confirm delete
    if (
      !window.confirm(
        `Hapus user ${user.username}? Tindakan ini tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }

    setIsDeletingUser(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[DELETE] User ${user.email} deleted successfully:`, data);
        setUsers(users.filter((u) => u.id !== userId));
        toast.success(`User ${user.username} berhasil dihapus dari database`);
      } else {
        const errorData = await response.json();
        console.error(`[DELETE] Error deleting user:`, errorData);
        toast.error(errorData.error || "Gagal menghapus user");
      }
    } catch (error) {
      console.error("[DELETE] Network error:", error);
      toast.error("Gagal menghapus user - periksa koneksi internet");
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    setIsTogglingUserStatus(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (response.ok) {
        setUsers(
          users.map((u) =>
            u.id === userId ? { ...u, isActive: !u.isActive } : u,
          ),
        );
        toast.success(
          `User ${user.isActive ? "dinonaktifkan" : "diaktifkan"} berhasil`,
        );
      } else {
        toast.error("Gagal mengubah status user");
      }
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast.error("Gagal mengubah status user");
    } finally {
      setIsTogglingUserStatus(false);
    }
  };

  const handleOpenMessageModal = (user: User) => {
    setSelectedUserForMessage(user);
    setMessageText("");
    setShowMessageModal(true);
  };

  const handleSendMessage = async () => {
    if (!selectedUserForMessage || !messageText.trim()) {
      toast.error("Pesan tidak boleh kosong");
      return;
    }

    setIsSendingMessage(true);
    try {
      const response = await fetch("/api/admin/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserForMessage.id,
          message: messageText,
        }),
      });

      if (response.ok) {
        toast.success(`Pesan terkirim ke ${selectedUserForMessage.username}`);
        setShowMessageModal(false);
        setSelectedUserForMessage(null);
        setMessageText("");
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Gagal mengirim pesan");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Gagal mengirim pesan");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleTogglePump = async () => {
    // If pump is OFF, show duration modal before turning ON
    if (!isPumpOn) {
      setShowDurationModal(true);
      return;
    }

    // If pump is ON, turn it OFF directly (no duration needed)
    await handlePumpToggleWithDuration(null, false);
  };

  const handlePumpToggleWithDuration = async (
    duration: number | null,
    isManualMode: boolean,
  ) => {
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
          duration: duration, // Hours for timed mode
          isManualMode: isManualMode, // true for manual, false for timed
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[PUMP] Toggle response:", data);
        const newIsOn = data.data?.isOn ?? !isPumpOn;
        setIsPumpOn(newIsOn);

        // Store manual mode state if turning ON
        if (newIsOn) {
          setIsManualMode(isManualMode);
        } else {
          setIsManualMode(false);
        }

        // Show appropriate message
        if (data.data?.reason === "timeout") {
          toast.warning(data.message || "Pompa dimatikan (timeout)");
        } else {
          const modeText = isManualMode
            ? "(Manual)"
            : duration
              ? `(${duration} jam)`
              : "";
          toast.success(
            data.message ||
              `Pompa ${!isPumpOn ? "dihidupkan " + modeText : "dimatikan"}`,
          );
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
            {/* Status Sistem - Gabungan Baterai & Koneksi */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold mb-6">Status Sistem</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* BLOK 1: Baterai */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Battery className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-gray-700">Baterai</h3>
                  </div>

                  {/* Mini Battery Visual */}
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-28 border-3 border-emerald-600 rounded-md flex flex-col items-center justify-center bg-white relative">
                      <div
                        className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
                          battery >= 75
                            ? "bg-emerald-500"
                            : battery >= 50
                              ? "bg-yellow-500"
                              : battery >= 25
                                ? "bg-orange-500"
                                : "bg-red-500"
                        }`}
                        style={{ height: `${battery}%` }}
                      />
                      <span className="relative text-xl font-bold text-gray-800 z-10">
                        {battery.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <p
                      className={`text-lg font-bold mb-1 ${
                        battery >= 75
                          ? "text-emerald-600"
                          : battery >= 50
                            ? "text-yellow-600"
                            : battery >= 25
                              ? "text-orange-600"
                              : "text-red-600"
                      }`}
                    >
                      {battery >= 75
                        ? "Optimal"
                        : battery >= 50
                          ? "Normal"
                          : battery >= 25
                            ? "Rendah"
                            : "Kritis"}
                    </p>
                    <p className="text-xs text-gray-600">
                      {battery >= 75
                        ? "Baik"
                        : battery >= 50
                          ? "Cukup"
                          : battery >= 25
                            ? "Perlu Diisi"
                            : "Segera Isi"}
                    </p>
                  </div>
                </div>

                {/* BLOK 2: Status Perangkat */}
                <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-6 border border-sky-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-sky-100 rounded-lg">
                      {isOnline ? (
                        <Wifi className="w-5 h-5 text-sky-600" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-700">Perangkat</h3>
                  </div>

                  <div className="flex flex-col items-center justify-center py-4">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                        isOnline ? "bg-emerald-100" : "bg-red-100"
                      }`}
                    >
                      {isOnline ? (
                        <Wifi className={`w-7 h-7 text-emerald-600`} />
                      ) : (
                        <WifiOff className={`w-7 h-7 text-red-600`} />
                      )}
                    </div>
                    <p
                      className={`text-lg font-bold ${
                        isOnline ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {isOnline ? "Terhubung" : "Terputus"}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">
                      {isOnline ? "Koneksi aktif" : "Tidak terhubung"}
                    </p>
                  </div>
                </div>

                {/* BLOK 3: Sinyal Kualitas */}
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-6 border border-violet-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-violet-100 rounded-lg">
                      <Activity className="w-5 h-5 text-violet-600" />
                    </div>
                    <h3 className="font-semibold text-gray-700">Signal</h3>
                  </div>

                  <div className="flex flex-col items-center justify-center py-4">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                        rssi > 20
                          ? "bg-emerald-100"
                          : rssi > 10
                            ? "bg-yellow-100"
                            : "bg-red-100"
                      }`}
                    >
                      <Activity
                        className={`w-7 h-7 ${
                          rssi > 20
                            ? "text-emerald-600"
                            : rssi > 10
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      />
                    </div>
                    <p
                      className={`text-lg font-bold ${
                        rssi > 20
                          ? "text-emerald-600"
                          : rssi > 10
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {rssi > 20 ? "Kuat" : rssi > 10 ? "Sedang" : "Lemah"}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">CSQ: {rssi}/31</p>
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
                  pH Real-time
                </h3>
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="text-center">
                    {/* pH Value - Angka besar dengan warna dinamis */}
                    <div className="mb-4">
                      <span
                        className="text-7xl font-bold transition-colors duration-300"
                        style={{ color: phColor }}
                      >
                        {currentPH.toFixed(2)}
                      </span>
                    </div>

                    {/* Status deskripsi */}
                    <p className="text-sm font-medium text-gray-600">
                      {getPhTextStatus(currentPH)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Water Level */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Droplet className="w-5 h-5" />
                  Tinggi Permukaan Air
                </h3>
                <WaterLevelMeter
                  level={waterLevel}
                  mode="sawah"
                  maxHeight={80}
                />
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

            {/* Status Lahan */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold mb-4">Status Lahan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* KOLAM IKAN Block */}
                <div
                  className={`border-2 rounded-lg p-5 ${getKolamBlockColor(currentPH).border} ${getKolamBlockColor(currentPH).bg}`}
                >
                  <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <Fish className="w-5 h-5" />
                    Kolam Ikan
                  </h3>

                  {currentPH < 4.0 ? (
                    <div className="space-y-3">
                      <div className="bg-red-100 border border-red-300 rounded p-3">
                        <p className="text-sm font-bold text-red-700">
                          Bahaya: Ikan Mati
                        </p>
                        <p className="text-xs text-red-800 mt-2">
                          💡 Kuras & Ganti Air Total
                        </p>
                      </div>
                    </div>
                  ) : currentPH >= 4.0 && currentPH < 6.5 ? (
                    <div className="space-y-3">
                      <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
                        <p className="text-sm font-bold text-yellow-700">
                          Air Asam
                        </p>
                        <p className="text-xs text-yellow-800 mt-2">
                          💡 Lakukan Pengapuran
                        </p>
                      </div>
                    </div>
                  ) : currentPH >= 6.5 && currentPH <= 8.5 ? (
                    <div className="space-y-3">
                      <div className="bg-green-100 border border-green-300 rounded p-3">
                        <p className="text-sm font-bold text-green-700">
                          ✓ pH Optimal
                        </p>
                        <p className="text-xs text-green-800 mt-2">
                          💡 Pertahankan Kondisi
                        </p>
                      </div>
                    </div>
                  ) : currentPH > 8.5 && currentPH <= 9.5 ? (
                    <div className="space-y-3">
                      <div className="bg-orange-100 border border-orange-300 rounded p-3">
                        <p className="text-sm font-bold text-orange-700">
                          Air Basa
                        </p>
                        <p className="text-xs text-orange-800 mt-2">
                          💡 Tambah Air Tawar
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-red-100 border border-red-300 rounded p-3">
                        <p className="text-sm font-bold text-red-700">
                          Bahaya: Ikan Stres
                        </p>
                        <p className="text-xs text-red-800 mt-2">
                          💡 Netralisir Segera
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

                  {currentPH < 4.5 ? (
                    <div className="space-y-3">
                      <div className="bg-red-100 border border-red-300 rounded p-3">
                        <p className="text-sm font-bold text-red-700">
                          Sangat Asam
                        </p>
                        <p className="text-xs text-red-800 mt-2">
                          💡 Kapur Dosis Tinggi
                        </p>
                      </div>
                    </div>
                  ) : currentPH >= 4.5 && currentPH < 5.5 ? (
                    <div className="space-y-3">
                      <div className="bg-orange-100 border border-orange-300 rounded p-3">
                        <p className="text-sm font-bold text-orange-700">
                          Kurang Subur
                        </p>
                        <p className="text-xs text-orange-800 mt-2">
                          💡 Tabur Dolomit
                        </p>
                      </div>
                    </div>
                  ) : currentPH >= 5.5 && currentPH <= 7.0 ? (
                    <div className="space-y-3">
                      <div className="bg-green-100 border border-green-300 rounded p-3">
                        <p className="text-sm font-bold text-green-700">
                          ✓ pH Optimal
                        </p>
                        <p className="text-xs text-green-800 mt-2">
                          💡 Pertahankan Kondisi
                        </p>
                      </div>
                    </div>
                  ) : currentPH > 7.0 && currentPH <= 8.0 ? (
                    <div className="space-y-3">
                      <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
                        <p className="text-sm font-bold text-yellow-700">
                          Sedikit Basa
                        </p>
                        <p className="text-xs text-yellow-800 mt-2">
                          💡 Pantau Perkembangan
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-orange-100 border border-orange-300 rounded p-3">
                        <p className="text-sm font-bold text-orange-700">
                          Terlalu Basa
                        </p>
                        <p className="text-xs text-orange-800 mt-2">
                          💡 Tambah Air Hujan
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Riwayat Pompa - Khusus Admin */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                Riwayat Kontrol Pompa
              </h3>

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
                          disabled={isTogglingUserStatus}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.createdAt}
                      </td>
                      <td className="px-6 py-4 flex justify-center gap-2">
                        <button
                          onClick={() => handleOpenMessageModal(user)}
                          className="p-2 hover:bg-blue-100 rounded text-blue-600 transition"
                          title="Kirim pesan ke user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 hover:bg-red-100 rounded text-red-600 transition"
                          disabled={isDeletingUser}
                          title="Hapus user"
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

      {/* Send Message Modal */}
      {showMessageModal && selectedUserForMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-1">Kirim Pesan</h2>
            <p className="text-sm text-gray-600 mb-6">
              Ke:{" "}
              <span className="font-semibold">
                {selectedUserForMessage.username}
              </span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pesan
                </label>
                <textarea
                  placeholder="Ketik pesan Anda di sini..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={isSendingMessage}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={5}
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setSelectedUserForMessage(null);
                  setMessageText("");
                }}
                disabled={isSendingMessage}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSendMessage}
                disabled={isSendingMessage}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSendingMessage ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Mengirim...
                  </>
                ) : (
                  "Kirim"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
