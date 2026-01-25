"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";

const ADMIN_USERNAME = process.env.NEXT_PUBLIC_ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Validate credentials
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        // Store admin session in localStorage
        const adminToken = btoa(`${username}:${Date.now()}`);
        localStorage.setItem("adminToken", adminToken);
        localStorage.setItem("adminLoginTime", new Date().toISOString());

        // Also set cookie for middleware protection
        document.cookie = `adminToken=${adminToken}; path=/; max-age=${24 * 60 * 60}`;

        // Redirect to admin page
        router.push("/admin");
      } else {
        setError("Username atau Password admin salah!");
      }
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-center mb-2">AgriSense</h1>
          <p className="text-red-600 text-center text-sm font-semibold">
            Panel Administrasi
          </p>
          <p className="text-gray-400 text-center text-xs mt-2">
            Silakan masuk dengan kredensial admin
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Username Admin
            </label>
            <input
              type="text"
              className="w-full p-3 mt-1 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
              placeholder="Masukkan username admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <PasswordInput
            id="admin-password"
            label="Password Admin"
            placeholder="Masukkan password admin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Memverifikasi..." : "Masuk Panel Admin"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-xs text-gray-500">
            Kembali ke halaman
          </p>
          <Link
            href="/"
            className="block mt-2 text-center text-red-600 font-bold hover:text-red-700 border border-red-600 px-4 py-2 rounded-lg transition-all"
          >
            Halaman Utama
          </Link>
        </div>
      </div>
    </div>
  );
}
