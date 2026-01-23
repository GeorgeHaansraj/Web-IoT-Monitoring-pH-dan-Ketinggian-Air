"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Shield,
  LogOut,
  Briefcase,
  PhoneCall,
  Contact2Icon,
  Bell,
  Lock,
  Eye,
  Check,
  X,
  MailIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button"; // Menggunakan komponen UI yang sudah ada
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [openNotificationDialog, setOpenNotificationDialog] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
  });
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [privacy, setPrivacy] = useState({
    profilePublic: false,
    twoFactorEnabled: false,
  });

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
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-bold">
              Hak Akses
            </p>
            <p className="text-sm font-semibold text-gray-700 capitalize">
              Pemilik {user?.role || "Umum"}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-50 p-2 rounded-lg">
            <Contact2Icon className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-bold">
              Nomor Telepon
            </p>
            <p className="text-sm font-semibold text-gray-700">
              {user?.phone || "082379238544"}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-red-50 p-2 rounded-lg">
            <MailIcon className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase font-bold">
              Email
            </p>
            <p className="text-sm font-semibold text-gray-700">
              {user?.email || "georgehaansraj@example.com"}
            </p>
          </div>
        </div>
      </div>

      {/* Pengaturan Akun */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 px-1">Pengaturan</h3>

        {/* Notifikasi */}
        <button
          onClick={() => setOpenNotificationDialog(true)}
          className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-4">
            <div className="bg-orange-50 p-2 rounded-lg">
              <Bell className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500 uppercase font-bold">
                Pemberitahuan
              </p>
              <p className="text-sm font-semibold text-gray-700">
                Kelola Notifikasi
              </p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
        </button>

        {/* Privasi & Keamanan */}
        <button
          onClick={() => setShowPrivacyDialog(true)}
          className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 p-2 rounded-lg">
              <Eye className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500 uppercase font-bold">
                Privasi
              </p>
              <p className="text-sm font-semibold text-gray-700">
                Pengaturan Privasi
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
            <div className="space-y-2">
              <Label htmlFor="current-password">Sandi Saat Ini</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Masukkan sandi saat ini"
                value={passwords.current}
                onChange={(e) =>
                  setPasswords({ ...passwords, current: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Sandi Baru</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Masukkan sandi baru"
                value={passwords.new}
                onChange={(e) =>
                  setPasswords({ ...passwords, new: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Konfirmasi Sandi</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Konfirmasi sandi baru"
                value={passwords.confirm}
                onChange={(e) =>
                  setPasswords({ ...passwords, confirm: e.target.value })
                }
              />
            </div>
            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Sandi berhasil diubah</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
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
              onClick={() => {
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
                setPasswordError("");
                setPasswordSuccess(true);
                setTimeout(() => {
                  setOpenPasswordDialog(false);
                  setPasswords({ current: "", new: "", confirm: "" });
                  setPasswordSuccess(false);
                }, 2000);
              }}
            >
              Ubah Sandi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Notifikasi */}
      <Dialog
        open={openNotificationDialog}
        onOpenChange={setOpenNotificationDialog}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kelola Notifikasi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm text-gray-700">
                  Notifikasi Email
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Terima update via email
                </p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, email: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm text-gray-700">
                  Notifikasi SMS
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Terima update via SMS
                </p>
              </div>
              <Switch
                checked={notifications.sms}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, sms: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm text-gray-700">
                  Notifikasi Push
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Terima update via aplikasi
                </p>
              </div>
              <Switch
                checked={notifications.push}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, push: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenNotificationDialog(false)}
            >
              Tutup
            </Button>
            <Button
              onClick={() => {
                setOpenNotificationDialog(false);
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Privasi & Keamanan */}
      <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pengaturan Privasi & Keamanan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm text-gray-700">
                  Profil Publik
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Biarkan orang lain melihat profil Anda
                </p>
              </div>
              <Switch
                checked={privacy.profilePublic}
                onCheckedChange={(checked) =>
                  setPrivacy({ ...privacy, profilePublic: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-sm text-gray-700">
                  Autentikasi Dua Faktor
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Tingkatkan keamanan akun Anda
                </p>
              </div>
              <Switch
                checked={privacy.twoFactorEnabled}
                onCheckedChange={(checked) =>
                  setPrivacy({ ...privacy, twoFactorEnabled: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPrivacyDialog(false)}
            >
              Tutup
            </Button>
            <Button onClick={() => setShowPrivacyDialog(false)}>Simpan</Button>
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
