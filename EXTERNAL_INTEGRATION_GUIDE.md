# Panduan Integrasi Sistem Eksternal (Direct Database Access)

Dokumen ini menjelaskan cara **website lain** berinteraksi dengan database yang sama tanpa merusak logika kontrol pompa yang ada di sistem utama.

## 🏗️ Arsitektur

Sistem kontrol pompa bekerja dengan 3 komponen utama yang menggunakan database yang sama:
1.  **Dashboard Utama (Next.js):** Mengontrol UI, Timer, Logging, dan Status.
2.  **Perangkat IoT (ESP32):** Membaca database untuk menyalakan/mematikan relay.
3.  **Website Eksternal (Anda):** Dapat mengirim perintah langsung ke database.

⚠️ **PENTING:** Karena semua membaca satu database (`device_controls`), urutan dan cara penulisan data sangat krusial agar tidak terjadi konflik (race condition).

## 🗄️ Koneksi Database

Pastikan website eksternal Anda terhubung ke database PostgreSQL yang sama. Gunakan driver standar (PDO, pg, dll).

## ⚙️ Operasi Kontrol Pompa

Untuk mengontrol pompa, Anda harus memanipulasi dua tabel:
-   `device_controls`: Tabel utama yang dibaca oleh ESP32.
-   `pump_timers`: Tabel timer otomatis (opsional tapi disarankan di-reset).

### 1️⃣ Menghidupkan Pompa (TURN ON)

Ketika tombol **ON** ditekan di website eksternal, Anda **WAJIB** menjalankan query berikut dalam satu transaksi:

```sql
BEGIN;

-- 1. Beritahu ESP32 untuk menyala
-- Menggunakan INSERT ... ON CONFLICT agar aman jika baris belum ada
INSERT INTO device_controls (id, "deviceId", mode, command, "updatedAt", "createdAt", "actionBy", reason)
VALUES (
    gen_random_uuid(), -- ID Baru
    'sawah',           -- Target Device ('sawah' atau 'kolam')
    'PUMP',            -- Mode Selalu 'PUMP'
    'ON',              -- Command 'ON'
    NOW(),             -- Waktu Update
    NOW(),             -- Waktu Buat
    'website-lain',    -- Identitas Pengubah (Bebas)
    'Manual Remote'    -- Alasan
)
ON CONFLICT ("deviceId", mode)
DO UPDATE SET 
    command = 'ON', 
    "updatedAt" = NOW(), 
    "actionBy" = 'website-lain',
    reason = 'Manual Remote';

-- 2. Reset Timer Otomatis (PENTING!)
-- Ini mencegah Dashboard Utama mematikan pompa secara tiba-tiba karena mengira timer lama sudah habis.
INSERT INTO pump_timers (id, mode, duration, "startTime", "isManualMode", "updatedAt", "createdAt")
VALUES (gen_random_uuid(), 'sawah', NULL, NULL, true, NOW(), NOW())
ON CONFLICT (mode)
DO UPDATE SET 
    duration = NULL, 
    "startTime" = NULL, 
    "isManualMode" = true, 
    "updatedAt" = NOW();

COMMIT;
```

**Penjelasan:**
*   Mengubah `command` menjadi `ON` menyalakan pompa.
*   Mereset `duration` dan `startTime` menjadi `NULL` memastikan timer Dashboard Utama tidak berjalan mundur.
*   Mengatur `isManualMode = true` memastikan Dashboard Utama tahu ini mode manual.

### 2️⃣ Mematikan Pompa (TURN OFF)

Ketika tombol **OFF** ditekan:

```sql
INSERT INTO device_controls (id, "deviceId", mode, command, "updatedAt", "createdAt", "actionBy", reason)
VALUES (gen_random_uuid(), 'sawah', 'PUMP', 'OFF', NOW(), NOW(), 'website-lain', 'Manual Remote')
ON CONFLICT ("deviceId", mode)
DO UPDATE SET 
    command = 'OFF', 
    "updatedAt" = NOW(), 
    "actionBy" = 'website-lain',
    reason = 'Manual Remote';
```

## 🚨 Pantangan (DO NOT)

1.  **JANGAN ubah struktur tabel.**
2.  **JANGAN gunakan `deviceId` selain 'sawah' atau 'kolam'.**
3.  **JANGAN gunakan `mode` selain 'PUMP'** pada tabel `device_controls` untuk kontrol pompa.
4.  **JANGAN lupa update kolom `updatedAt`** karena Dashboard Utama menggunakannya untuk mendeteksi perubahan ("polling").

## 🔄 Sinkronisasi

Dashboard Utama menggunakan teknik **Polling** (cek database tiap 2 detik).
*   Jika website eksternal mengubah status jadi `ON`, tombol di Dashboard Utama akan otomatis berubah jadi `ON` dalam waktu < 2 detik.
*   Tidak perlu melakukan apa-apa lagi agar sinkron.
