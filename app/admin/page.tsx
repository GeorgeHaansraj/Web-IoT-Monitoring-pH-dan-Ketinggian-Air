"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Settings,
  BarChart3,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Battery,
  DollarSign,
  Wifi,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user" | "operator";
  location: "sawah" | "kolam" | "both";
  isActive: boolean;
  createdAt: string;
}

interface SystemStats {
  totalUsers: number;
  activeDevices: number;
  systemHealth: number;
  lastSync: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "devices" | "settings">(
    "users",
  );
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      username: "admin_user",
      email: "admin@example.com",
      role: "admin",
      location: "both",
      isActive: true,
      createdAt: "2025-01-01",
    },
    {
      id: "2",
      username: "operator_sawah",
      email: "operator@example.com",
      role: "operator",
      location: "sawah",
      isActive: true,
      createdAt: "2025-01-15",
    },
  ]);

  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 2,
    activeDevices: 2,
    systemHealth: 98,
    lastSync: "2026-01-24 14:30:00",
  });

  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "user" as const,
    location: "sawah" as const,
  });

  const [showPasswordFields, setShowPasswordFields] = useState<{
    [key: string]: boolean;
  }>({});

  // System information states
  const [battery, setBattery] = useState(79.5);
  const [credit, setCredit] = useState(48800);
  const [kuota, setKuota] = useState(4.26);

  const handleAddUser = () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast.error("Semua field harus diisi");
      return;
    }

    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      location: newUser.location,
      isActive: true,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setUsers([...users, user]);
    setNewUser({
      username: "",
      email: "",
      password: "",
      role: "user",
      location: "sawah",
    });
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">
                Kelola pengguna dan sistem monitoring
              </p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            Last sync: {stats.lastSync}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* System Information Cards */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-100">
          <h2 className="text-xl font-bold mb-4">Informasi Sistem</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Battery */}
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

            {/* Credit/Pulsa */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600 font-medium">Pulsa</span>
              </div>
              <div className="text-2xl font-bold">Rp{(credit / 1000).toFixed(1)}k</div>
              <div className="text-xs text-gray-500 mt-1">Tersisa</div>
            </div>

            {/* Data */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wifi className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-600 font-medium">Data</span>
              </div>
              <div className="text-2xl font-bold">{kuota.toFixed(2)} GB</div>
              <div className="text-xs text-gray-500 mt-1">Tersisa</div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Users</p>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Mode Aktif</p>
                <p className="text-2xl font-bold capitalize">
                  {users.filter(u => u.isActive).map(u => u.location).join(', ') || 'Tidak Ada'}
                </p>
              </div>
              <BarChart3 className="w-12 h-12 text-green-200" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Status Koneksi</p>
                <p className="text-2xl font-bold text-green-600">Online</p>
              </div>
              <AlertCircle className="w-12 h-12 text-green-200" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 bg-white rounded-lg p-2 border border-gray-200">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-2 rounded-md font-medium transition ${activeTab === "users"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            <Users className="inline w-4 h-4 mr-2" />
            Users
          </button>
          <button
            onClick={() => setActiveTab("devices")}
            className={`px-6 py-2 rounded-md font-medium transition ${activeTab === "devices"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            <BarChart3 className="inline w-4 h-4 mr-2" />
            Devices
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-6 py-2 rounded-md font-medium transition ${activeTab === "settings"
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            <Settings className="inline w-4 h-4 mr-2" />
            Settings
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold">Daftar Users</h2>
              <button
                onClick={() => setShowAddUserForm(!showAddUserForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tambah User
              </button>
            </div>

            {/* Add User Form */}
            {showAddUserForm && (
              <div className="p-6 bg-blue-50 border-b border-blue-200">
                <h3 className="font-bold mb-4">Form Tambah User Baru</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Username
                    </label>
                    <Input
                      placeholder="username"
                      value={newUser.username}
                      onChange={(e) =>
                        setNewUser({ ...newUser, username: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email
                    </label>
                    <Input
                      placeholder="email@example.com"
                      type="email"
                      value={newUser.email}
                      onChange={(e) =>
                        setNewUser({ ...newUser, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Password
                    </label>
                    <Input
                      placeholder="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Role
                    </label>
                    <select
                      value={newUser.role}
                      onChange={(e) =>
                        setNewUser({
                          ...newUser,
                          role: e.target.value as "admin" | "user" | "operator",
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="user">User</option>
                      <option value="operator">Operator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Location
                    </label>
                    <select
                      value={newUser.location}
                      onChange={(e) =>
                        setNewUser({
                          ...newUser,
                          location: e.target.value as
                            | "sawah"
                            | "kolam"
                            | "both",
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="sawah">Sawah</option>
                      <option value="kolam">Kolam</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleAddUser}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setShowAddUserForm(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium">{user.username}</td>
                      <td className="px-6 py-4 text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${user.role === "admin"
                            ? "bg-red-100 text-red-800"
                            : user.role === "operator"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                          {user.location}
                        </span>
                      </td>
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
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition text-blue-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === "devices" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Device Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-2 border-green-500 rounded-lg p-6 bg-green-50">
                <h3 className="font-bold text-lg mb-2">Kolam Device</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Status:{" "}
                  <span className="text-green-600 font-semibold">Active</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">pH: 7.34</p>
                <p className="text-sm text-gray-600 mb-2">Water Level: 65%</p>
                <p className="text-xs text-gray-500">
                  Last update: 2 minutes ago
                </p>
              </div>
              <div className="border-2 border-yellow-500 rounded-lg p-6 bg-yellow-50">
                <h3 className="font-bold text-lg mb-2">Sawah Device</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Status:{" "}
                  <span className="text-yellow-600 font-semibold">Idle</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">pH: 7.10</p>
                <p className="text-sm text-gray-600 mb-2">Water Level: 42%</p>
                <p className="text-xs text-gray-500">
                  Last update: 5 minutes ago
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-6">System Settings</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <p className="font-medium">Enable MQTT Auto-Connect</p>
                  <p className="text-sm text-gray-500">
                    Otomatis terhubung ke MQTT broker saat startup
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <p className="font-medium">Enable Data Logging</p>
                  <p className="text-sm text-gray-500">
                    Simpan semua data sensor ke database
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <p className="font-medium">Enable Email Alerts</p>
                  <p className="text-sm text-gray-500">
                    Kirim notifikasi via email untuk anomali
                  </p>
                </div>
                <Switch />
              </div>
              <div className="mt-8">
                <label className="block text-sm font-medium mb-2">
                  MQTT Broker URL
                </label>
                <Input
                  placeholder="mqtt://broker.example.com:1883"
                  defaultValue="mqtt://localhost:1883"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Data Retention (days)
                </label>
                <Input type="number" defaultValue="30" />
              </div>
              <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition mt-6">
                Simpan Perubahan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
