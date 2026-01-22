"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Phone, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nama: "",
    noTelp: "",
    role: "sawah",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi Password
    if (formData.password !== formData.confirmPassword) {
      alert("Password dan Konfirmasi Password tidak cocok!");
      return;
    }

    // Simulasi Berhasil Daftar
    console.log("Data Pendaftar:", formData);
    alert("Pendaftaran Berhasil! Mengalihkan ke Dashboard...");

    // Navigasi Otomatis sesuai Hak Akses (Role)
    // Karena ini fokus frontend, kita langsung arahkan ke page terkait
    router.push(`/${formData.role}`);
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
          <CardDescription>
            Lengkapi data diri untuk akses AgriSense
          </CardDescription>
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
                  onChange={(e) =>
                    setFormData({ ...formData, noTelp: e.target.value })
                  }
                />
              </div>
            </div>

            {/* 3. Hak Akses (Hanya satu opsi) */}
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <Label className="text-blue-600 font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Pilih Hak Akses
              </Label>
              <RadioGroup
                defaultValue="sawah"
                onValueChange={(val: string) =>
                  setFormData({ ...formData, role: val })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sawah" id="r1" />
                  <Label htmlFor="r1" className="cursor-pointer">
                    Pemilik Sawah (Pompa 1)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="kolam" id="r2" />
                  <Label htmlFor="r2" className="cursor-pointer">
                    Pemilik Kolam (Pompa 2)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* 4. Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Buat username unik"
                required
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            </div>

            {/* 5 & 6. Password */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pass">Password</Label>
                <Input
                  id="pass"
                  type="password"
                  required
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Konfirmasi</Label>
                <Input
                  id="confirm"
                  type="password"
                  required
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-base font-bold"
            >
              Daftar
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
