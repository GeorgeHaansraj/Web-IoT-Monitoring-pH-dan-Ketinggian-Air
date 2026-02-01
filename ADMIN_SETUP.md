# 🔐 Admin Account Setup

## ✅ Admin Account Telah Dibuat

Admin account sudah berhasil di-setup di database NeonDB.

### 📋 Kredensial Login

| Field        | Value      |
| ------------ | ---------- |
| **Username** | `admin`    |
| **Password** | `admin123` |
| **Role**     | `admin`    |
| **Halaman**  | `/admin`   |

### 🔗 Akses Admin Panel

1. Buka: http://localhost:3000/login
   - Atau jika production: https://your-vercel-domain.com/login

2. Masukkan kredensial:
   - Username: `admin`
   - Password: `admin123`

3. Dashboard akan otomatis redirect ke halaman admin: `/admin`

### 🎯 Fitur Admin Panel

Halaman admin (`app/admin/page.tsx`) memiliki fitur:

- ✅ Manajemen pengguna (CRUD)
- ✅ Tambah pengguna baru
- ✅ Edit pengguna
- ✅ Hapus pengguna
- ✅ Toggle status user aktif/tidak aktif
- ✅ Real-time monitoring (battery, pH, water level)
- ✅ Device status overview

### 🔄 Flow Login

```
Login Page (/login)
    ↓ (masukkan admin / admin123)
Auth Provider (NextAuth)
    ↓ (validasi credentials dari database)
Session Created
    ↓ (cek role user)
Role = "admin"
    ↓ (redirect ke admin page)
Admin Panel (/admin)
    ↓ (full control)
```

### 📝 Membuat Admin Baru (Optional)

Jika ingin menambah admin lain, bisa langsung di database atau via admin panel:

```bash
# Di database (manual):
npx prisma studio

# Edit table "User" dan buat entry baru dengan:
# - email: (unique)
# - name: (nama admin)
# - password: (hash dengan bcryptjs)
# - role: "admin"
```

### 🔒 Security Notes

- Password di-hash dengan bcryptjs sebelum disimpan
- Session management dengan NextAuth
- Role-based access control (RBAC)
- Admin page protected dari unauthorized users

### 🛠️ Troubleshooting

Jika login tidak berhasil:

1. **Cek database:**

   ```bash
   npx prisma db execute
   SELECT * FROM "User" WHERE email = 'admin';
   ```

2. **Reset admin account:**

   ```bash
   npx tsx prisma/seed-admin.ts
   ```

3. **Cek session:**
   - Buka DevTools → Application → Cookies → auth-related cookies

---

**Status**: ✅ Ready to use! 🚀
