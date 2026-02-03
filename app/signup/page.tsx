"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Phone, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PasswordInput from "@/components/PasswordInput";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nama: "",
    noTelp: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validasi Password
    if (formData.password !== formData.confirmPassword) {
      setError("Password dan Konfirmasi Password tidak cocok!");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password minimal 6 karakter!");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nama: formData.nama,
          noTelp: formData.noTelp,
          username: formData.username,
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert("Pendaftaran Berhasil! Silakan login dengan akun baru Anda.");
        router.push("/login");
      } else {
        setError(result.error || "Gagal mendaftar. Silakan coba lagi.");
      }
    } catch (error) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#fafafa] p-4 flex flex-col justify-center font-sans">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/login")}
          className="p-0 hover:bg-transparent"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Kembali ke Login
        </Button>
      </div>

      <Card className="border-none shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Daftar Akun</CardTitle>
          <CardDescription>Lengkapi data diri anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            {/* 1. Nama */}
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Lengkap</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="nama"
                  placeholder="Masukkan nama Anda"
                  className="pl-10"
                  required
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                />
              </div>
            </div>

            {/* 2. Nomor Telepon */}
            <div className="space-y-2">
              <Label htmlFor="telp">Nomor Telepon</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="telp"
                  type="tel"
                  placeholder="0812xxxx"
                  className="pl-10"
                  required
                  value={formData.noTelp}
                  onChange={(e) =>
                    setFormData({ ...formData, noTelp: e.target.value })
                  }
                />
              </div>
            </div>

            {/* 3. Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Buat username unik"
                required
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            </div>

            {/* 4 & 5. Password */}
            <div className="grid grid-cols-2 gap-3">
              <PasswordInput
                id="pass"
                label="Password"
                placeholder="Min. 6 karakter"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
              <PasswordInput
                id="confirm"
                label="Konfirmasi"
                placeholder="Ulangi password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmPassword: e.target.value,
                  })
                }
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-base font-bold disabled:opacity-50"
            >
              {isLoading ? "Mendaftar..." : "Daftar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center mt-6 text-sm text-gray-600">
        Sudah memiliki akun?{" "}
        <Link href="/login" className="text-blue-600 font-bold hover:underline">
          Login di sini
        </Link>
      </p>
    </div>
  );
}
