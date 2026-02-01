# Admin Account Setup

## Akun Admin Telah Dibuat ✅

Admin account dengan kredensial berikut telah berhasil dibuat dan siap digunakan:

### Kredensial Login

- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `admin`

### Cara Login

1. Kunjungi halaman login: `http://localhost:3000/login`
2. Masukkan username: `admin`
3. Masukkan password: `admin123`
4. Klik tombol login

### Halaman Admin

Setelah login dengan akun admin, Anda akan memiliki akses ke halaman admin di:

- **URL**: `http://localhost:3000/admin`

### Fitur Halaman Admin

Halaman admin menyediakan fitur untuk mengelola:

- ✅ Daftar user dalam sistem
- ✅ Menambah user baru
- ✅ Menghapus user
- ✅ Mengedit informasi user
- ✅ Melihat status device (battery, signal, kuota)
- ✅ Toggle status user aktif/non-aktif

### Keamanan

- Halaman admin dilindungi dengan pemeriksaan role
- Hanya user dengan role `admin` yang dapat mengakses halaman admin
- Unauthenticated user akan diredirect ke halaman login
- Password di-hash menggunakan bcryptjs

### Struktur Database

Admin user disimpan di tabel `User` dengan struktur:

```
{
  id: string (CUID)
  email: "admin"
  name: "Administrator"
  password: <hashed password>
  role: "admin"
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Akses Admin Page

Jika Anda sudah login dengan akun admin, akses admin panel dengan mengunjungi:

```
http://localhost:3000/admin
```

### Notes

- Akun admin sudah pasti ada di database
- Jika akun sudah ada, script akan skip pembuatan (idempotent)
- Gunakan kredensial ini untuk mengelola sistem monitoring
