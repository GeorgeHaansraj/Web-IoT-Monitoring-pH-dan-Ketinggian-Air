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
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface User {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const sessionData = useSession();
  const session = sessionData.data;
  const status = sessionData.status;

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin";
  const isLoading = status === "loading";

  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      username: "admin_user",
      email: "admin@example.com",
      isActive: true,
      createdAt: "2025-01-01",
    },
  ]);

  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
  });

  // System information states
  const [battery, setBattery] = useState(79.5);
  const [credit, setCredit] = useState(48800);
  const [kuota, setKuota] = useState(4.26);

  // Check admin authentication and redirect if needed
  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated" || !session || !isAdmin) {
      router.push("/login");
      return;
    }
  }, [status, session, isAdmin, router]);

  // Fetch users from database
  useEffect(() => {
    if (status !== "authenticated" || !isAdmin) {
      return;
    }

    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/admin/users");
        if (!response.ok) {
          console.warn("Failed to fetch users, using default data");
          return;
        }
        const data = await response.json();

        if (data.users && Array.isArray(data.users)) {
          setUsers(data.users);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    const fetchDeviceStatus = async () => {
      try {
        const response = await fetch("/api/device-status");
        if (!response.ok) {
          console.warn("Failed to fetch device status");
          return;
        }
        const data = await response.json();

        if (data.battery !== undefined) setBattery(data.battery);
        if (data.signal !== undefined) setCredit(data.signal * 1000);
        if (data.kuota !== undefined) setKuota(data.kuota);
      } catch (error) {
        console.error("Error fetching device status:", error);
      }
    };

    fetchUsers();
    fetchDeviceStatus();
  }, [status, isAdmin]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    toast.success("Logout berhasil");
    router.push("/login");
  };

  if (isLoading || status === "unauthenticated" || !session || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isLoading
              ? "Memverifikasi akses admin..."
              : "Mengarahkan ke halaman login..."}
          </p>
        </div>
      </div>
    );
  }

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
    setNewUser({
      username: "",
      email: "",
      password: "",
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
              <p className="text-sm text-gray-500">Kelola pengguna sistem</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* System Information Cards */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-100">
          <h2 className="text-xl font-bold mb-4">Informasi Sistem</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Battery */}
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

            {/* Credit/Pulsa */}
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

            {/* Data */}
            <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wifi className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-600 font-medium">Data</span>
              </div>
              <div className="text-2xl font-bold">{kuota.toFixed(2)} GB</div>
              <div className="text-xs text-gray-500 mt-1">Tersisa</div>
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white rounded-lg shadow">
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

          {/* Add User Form */}
          {showAddUserForm && (
            <div className="p-6 bg-blue-50 border-b border-blue-200">
              <h3 className="font-bold mb-4">Tambah Pengguna Baru</h3>
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
                <div className="md:col-span-2">
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
                  <tr
                    key={user.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
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
      </div>
    </div>
  );
}
