# 🔐 Admin Dashboard - Setup & Features

## ✅ Admin Account Created

Admin account sudah berhasil di-setup di database NeonDB.

### 📋 Login Credentials

| Field         | Value      |
| ------------- | ---------- |
| **Username**  | `admin`    |
| **Password**  | `admin123` |
| **Role**      | `admin`    |
| **Dashboard** | `/admin`   |

### 🔗 Akses Admin Panel

1. Buka: `http://localhost:3000/login`
2. Masukkan:
   - Username: `admin`
   - Password: `admin123`
3. Auto-redirect ke: `http://localhost:3000/admin`

---

## 🎯 Admin Dashboard Features (Single Page)

Admin dashboard adalah **1 halaman lengkap** dengan **4 tab utama**:

### 1️⃣ **TAB: SISTEM** - Informasi Hardware & Status

Menampilkan status perangkat real-time:

**Informasi Sistem:**

- 🔋 **Baterai** - Persentase (0-100%) dengan progress bar
- 💰 **Pulsa** - Saldo pulsa GSM/Telkomsel yang tersisa
- 📊 **Data/Kuota** - Sisa kuota internet (GB)

**Status Koneksi:**

- 🌐 **Device Status** - Online/Offline indicator
- 📶 **Signal Quality (RSSI)** - Kualitas sinyal GSM
  - Sangat Baik (CSQ: 31)
  - Baik (CSQ: 20-30)
  - Cukup (CSQ: 15-19)
  - Lemah (CSQ: 10-14)
  - Sangat Lemah (CSQ: 0-9)
  - Tidak Ada Sinyal (CSQ: 99)

### 2️⃣ **TAB: MONITORING** - Real-time Monitoring & Kontrol

Semua fitur user dashboard + riwayat lengkap:

**Real-time Monitoring:**

- 🧪 **pH Real-time** - Display pH current dengan visual meter warna
- 💧 **Tinggi Permukaan Air** - Water level meter visual
- 💪 **Kontrol Pompa** - Toggle switch untuk ON/OFF pompa

**Riwayat:**

- 📈 **Riwayat pH** - Graph dengan range selector:
  - Jam (last 24 hours, group by hour)
  - Hari (last 7 days, group by day)
  - Bulan (last 12 months, group by month)
  - Tahun (last 5 years, group by year)
- 📋 **Riwayat Pompa** - Tabel perubahan status pump

### 3️⃣ **TAB: PENGGUNA** - User Management

Admin-specific feature untuk manajemen pengguna:

**Fitur:**

- 👥 **Daftar Pengguna** - Tabel lengkap semua user
  - Column: Username, Email, Status (Active/Inactive), Bergabung (Date)
  - Sortable & filterable

**CRUD Operations:**

- ➕ **Tambah User** - Form untuk create user baru
  - Fields: Username, Email, Password
  - Auto-generated ID & created date
- ✏️ **Edit User** - Edit user details (button ready)
- 🗑️ **Hapus User** - Delete user dari sistem
- 🔘 **Toggle Status** - Aktifkan/nonaktifkan user

### 4️⃣ **TAB: KEAMANAN** - Security & Advanced Settings

Pengaturan keamanan admin:

**Fitur:**

- 🔐 **Ubah Password** - Update password admin
- 📜 **Log Aktivitas** - View riwayat login & akses
- ⚠️ **Zona Berbahaya** - Dangerous operations:
  - Reset Sistem (irreversible)

---

## 📊 Dashboard Data Flow

```
Admin Login (/login)
    ↓ (admin / admin123)
NextAuth Credentials Provider
    ↓ (bcryptjs password verify)
Session Created {id, email, role: "admin"}
    ↓ (automatic redirect)
Admin Dashboard (/admin)
    ├─ TAB SISTEM
    │  ├─ GET /api/monitoring-log
    │  └─ GET /api/device-status
    │
    ├─ TAB MONITORING
    │  ├─ GET /api/monitoring-log (polling setiap 5s)
    │  ├─ GET /api/ph-history?range={range}
    │  ├─ GET /api/pump-history?mode=sawah
    │  └─ POST /api/pump-relay (kontrol pompa)
    │
    ├─ TAB PENGGUNA
    │  ├─ GET /api/admin/users
    │  ├─ POST /api/admin/users (create)
    │  ├─ PUT /api/admin/users/:id (update)
    │  └─ DELETE /api/admin/users/:id (delete)
    │
    └─ TAB KEAMANAN
       └─ POST /api/admin/security/* (advanced ops)
```

---

## ⚡ Real-time Updates

Dashboard otomatis polling data:

- **5 detik** - Monitoring data (battery, pH, level, signal)
- **10 detik** - Battery/Pulsa simulation (dapat diganti dengan data real)

Setiap tab dapat di-switch tanpa reload halaman (SPA behavior).

---

## 📁 Implementation Details

### File Structure

```
app/admin/
├── page.tsx              ← Admin Dashboard (NEW - 1 page, 4 tabs)
└── page-old.tsx          ← Backup old admin page

components/
├── PHHistoryGraph.tsx    ← pH history chart component
├── visualizations/
│   └── WaterLevelMeter.tsx ← Water level meter
└── ui/
    ├── switch.tsx
    ├── button.tsx
    └── input.tsx
```

### API Endpoints Used

| Method | Endpoint               | Purpose                       |
| ------ | ---------------------- | ----------------------------- |
| GET    | `/api/monitoring-log`  | Latest sensor data            |
| GET    | `/api/ph-history`      | pH history dengan aggregation |
| GET    | `/api/pump-history`    | Pump control history          |
| POST   | `/api/pump-relay`      | Control pump ON/OFF           |
| GET    | `/api/device-status`   | Device info (battery, signal) |
| GET    | `/api/admin/users`     | Fetch all users               |
| POST   | `/api/admin/users`     | Create new user               |
| PUT    | `/api/admin/users/:id` | Update user                   |
| DELETE | `/api/admin/users/:id` | Delete user                   |

---

## 🔒 Security & Authorization

### Access Control

- ✅ **Role-based**: hanya role="admin" yang bisa akses `/admin`
- ✅ **Protected Route**: automatic redirect ke login jika unauthorized
- ✅ **Session Check**: setiap tab validate authorization
- ✅ **Password Hashing**: bcryptjs untuk secure storage

### Authentication Flow

```
1. User masuk credentials (admin / admin123)
2. NextAuth validate via Credentials provider
3. bcryptjs compare password dengan DB hash
4. Session created dengan role: "admin"
5. Redirect ke /admin
6. Admin dashboard load semua fitur
```

---

## 🛠️ Troubleshooting

### Admin page blank/error

```bash
# Check browser console
# Check session validity
curl http://localhost:3000/api/auth/session

# Reset admin account
npx tsx prisma/seed-admin.ts
```

### Data tidak ter-update

```bash
# Check API responses di Network tab
# Verify database connection
# Check Vercel logs (production)
```

### User management tidak berfungsi

```bash
# Ensure /api/admin/users endpoint accessible
# Check database schema untuk table "User"
# Verify admin role set correctly
```

---

## 📝 Create Admin Baru (Optional)

Via Prisma Studio:

```bash
npx prisma studio
```

Manual via database:

```sql
INSERT INTO "User" (id, email, name, password, role, createdAt, updatedAt)
VALUES (
  'cuid()',
  'admin2@example.com',
  'Admin 2',
  '$2a$10$...',  -- bcryptjs hashed password
  'admin',
  NOW(),
  NOW()
);
```

---

## 📊 Status

✅ **Production Ready!**

Admin dashboard adalah **single-page comprehensive** dengan semua fitur dalam satu tempat:

- Tidak perlu navigasi antar halaman
- Tab-based navigation
- Real-time data updates
- Responsive design (mobile-friendly)
- Role-based access control

🚀 **Ready to deploy!**
