"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, LogOut, Lock, Check, X, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PasswordInput from "@/components/PasswordInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [showPumpHistory, setShowPumpHistory] = useState(false);
  const [pumpHistory, setPumpHistory] = useState<any[]>([]);
  const [pumpHistoryLoading, setPumpHistoryLoading] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Fetch pump history when modal opens
  useEffect(() => {
    if (showPumpHistory && pumpHistory.length === 0) {
      fetchPumpHistory();
    }
  }, [showPumpHistory]);

  const fetchPumpHistory = async () => {
    setPumpHistoryLoading(true);
    try {
      const response = await fetch(
        "/api/pump-history?mode=sawah&limit=20&offset=0",
      );
      if (response.ok) {
        const data = await response.json();
        setPumpHistory(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching pump history:", error);
    } finally {
      setPumpHistoryLoading(false);
    }
  };

  const handleChangePassword = async () => {
    // Validasi input lokal
    if (
      !passwords.current ||
      !passwords.new ||
      !passwords.confirm
    ) {
      setPasswordError("Semua field harus diisi");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setPasswordError("Sandi baru tidak cocok");
      return;
    }
    if (passwords.new.length < 6) {
      setPasswordError("Sandi baru harus minimal 6 karakter");
      return;
    }

    // Prevent double submit
    if (isChangingPassword) return;

    setIsChangingPassword(true);
    setPasswordError("");

    try {
      // Call API untuk change password
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(data.error || "Gagal mengubah sandi");
        return;
      }

      // Success
      setPasswordError("");
      setPasswordSuccess(true);
      console.log("[SECURITY] Password berhasil diubah");

      // Reset form dan close dialog setelah 2 detik
      setTimeout(() => {
        setOpenPasswordDialog(false);
        setPasswords({ current: "", new: "", confirm: "" });
        setPasswordSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordError("Terjadi kesalahan saat mengubah sandi");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Memuat Profil...
      </div>
    );
  }

  const user = session?.user as any;

  return (
    <div className="max-w-md mx-auto bg-[#fafafa] min-h-screen p-4 space-y-6 font-sans">
      {/* Header Navigasi */}
      <div className="flex items-center gap-4 py-2">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Profil</h1>
      </div>

      {/* Kartu Informasi Utama */}
      <Card className="border-none shadow-md overflow-hidden">
        <div className="bg-gray-800 h-24" />
        <CardContent className="relative pt-12 pb-6 text-center">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white p-1 rounded-full shadow-lg">
            <div className="bg-gray-100 rounded-full p-4">
              <User className="w-12 h-12 text-gray-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {user?.name || "Pemilik Lahan"}
          </h2>
          <p className="text-gray-500 text-sm">
            @{user?.username || "georgehaansraj"}
          </p>
        </CardContent>
      </Card>

      {/* Detail Akun */}
      <div className="space-y-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-50 p-2 rounded-lg">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-bold">
              Email
            </p>
            <p className="text-sm font-semibold text-gray-700">
              {user?.email || "user@example.com"}
            </p>
          </div>
        </div>
      </div>

      {/* Pengaturan Akun */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 px-1">Pengaturan</h3>

        {/* Riwayat Pompa */}
        <button
          onClick={() => setShowPumpHistory(true)}
          className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-4">
            <div className="bg-cyan-50 p-2 rounded-lg">
              <Power className="w-5 h-5 text-cyan-600" />
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500 uppercase font-bold">
                Riwayat Pompa
              </p>
              <p className="text-sm font-semibold text-gray-700">
                Lihat Aktivasi Pompa Terakhir
              </p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
        </button>

        {/* Ubah Sandi */}
        <button
          onClick={() => setOpenPasswordDialog(true)}
          className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-4">
            <div className="bg-purple-50 p-2 rounded-lg">
              <Lock className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500 uppercase font-bold">
                Keamanan
              </p>
              <p className="text-sm font-semibold text-gray-700">Ubah Sandi</p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
        </button>
      </div>

      {/* Dialog Ubah Sandi */}
      <Dialog open={openPasswordDialog} onOpenChange={setOpenPasswordDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Sandi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <PasswordInput
              id="current-password"
              label="Sandi Saat Ini"
              placeholder="Masukkan sandi saat ini"
              value={passwords.current}
              onChange={(e) =>
                setPasswords({ ...passwords, current: e.target.value })
              }
            />
            <PasswordInput
              id="new-password"
              label="Sandi Baru"
              placeholder="Masukkan sandi baru"
              value={passwords.new}
              onChange={(e) =>
                setPasswords({ ...passwords, new: e.target.value })
              }
            />
            <PasswordInput
              id="confirm-password"
              label="Konfirmasi Sandi"
              placeholder="Konfirmasi sandi baru"
              value={passwords.confirm}
              onChange={(e) =>
                setPasswords({ ...passwords, confirm: e.target.value })
              }
            />
            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                <X className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Sandi berhasil diubah</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setOpenPasswordDialog(false);
                setPasswords({ current: "", new: "", confirm: "" });
                setPasswordError("");
                setPasswordSuccess(false);
              }}
            >
              Batal
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? "Mengubah..." : "Ubah Sandi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Riwayat Pompa */}
      <Dialog open={showPumpHistory} onOpenChange={setShowPumpHistory}>
        <DialogContent className="max-w-sm max-h-96 overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Power className="w-5 h-5 text-cyan-600" />
              Riwayat Aktivasi Pompa
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 py-4">
            {pumpHistoryLoading ? (
              <div className="text-center py-8 text-gray-500">
                Memuat riwayat pompa...
              </div>
            ) : pumpHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Belum ada riwayat aktivasi pompa
              </div>
            ) : (
              pumpHistory.map((entry, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-700">
                      {entry.newState ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <Power className="w-3 h-3" /> Dihidupkan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <Power className="w-3 h-3" /> Dimatikan
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">
                      {entry.changedBy}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(entry.timestamp).toLocaleString("id-ID", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    dari {entry.previousState ? "ON" : "OFF"} ke{" "}
                    {entry.newState ? "ON" : "OFF"}
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowPumpHistory(false)}
              className="w-full"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tombol Aksi */}
      <div className="pt-4 space-y-3">
        <Button
          variant="outline"
          className="w-full py-6 rounded-xl border-red-100 text-red-600 hover:bg-red-50"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Keluar dari Akun
        </Button>
      </div>
    </div>
  );
}
