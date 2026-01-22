"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Username atau Password salah!");
    } else {
      router.push("/"); // Masuk ke dashboard
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <h1 className="text-2xl font-bold text-center mb-2">AgriSense</h1>
        <p className="text-gray-400 text-center text-sm mb-8">
          Silakan masuk untuk memantau lahan
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Username
            </label>
            <input
              type="text"
              className="w-full p-3 mt-1 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Password
            </label>
            <input
              type="password"
              className="w-full p-3 mt-1 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button
            type="submit"
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
          >
            Masuk
          </button>
        </form>
        <div className="mt-6 text-center text-sm">
          <p className="text-gray-500">Belum memiliki akun AgriSense?</p>
          <Link
            href="/signup"
            className="inline-block mt-2 text-blue-600 font-bold hover:text-blue-700 border border-blue-600 px-4 py-2 rounded-lg transition-all"
          >
            Daftar Akun Baru
          </Link>
        </div>
      </div>
    </div>
  );
}
