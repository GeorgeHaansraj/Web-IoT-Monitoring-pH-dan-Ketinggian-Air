# 🎯 FITUR BARU: CHANGE PASSWORD & RIWAYAT POMPA

## 📊 Perbandingan Sebelum & Sesudah

### SEBELUM:

```
Admin Dashboard
├─ Tab: Sistem
├─ Tab: Monitoring
├─ Tab: Pengguna
└─ Tab: Keamanan (3 fitur dummy)
    ├─ Ubah Password (tidak berfungsi)
    ├─ Log Aktivitas (tidak berfungsi)
    └─ Reset Sistem (tidak berfungsi)

Riwayat Pompa:
├─ Tidak ada user tracking
├─ Hanya tampil status ON/OFF
└─ Tidak tau siapa yang mengontrol
```

### SESUDAH:

```
Admin Dashboard
├─ Tab: Sistem
├─ Tab: Monitoring
│  └─ ✨ BARU: Riwayat Pompa dengan user tracking
├─ Tab: Pengguna
└─ Header: "Ubah Password" Button
   └─ ✨ BARU: Modal dialog (fully functional)

Riwayat Pompa:
├─ ✅ Track siapa yang mengontrol (admin name + email)
├─ ✅ Waktu kontrol terdetail (timestamp)
├─ ✅ Status ON/OFF dengan badge color
├─ ✅ Filter by mode (Sawah/Kolam)
└─ ✅ Real-time update (10s polling)
```

---

## 🔐 FITUR 1: UBAH PASSWORD (Change Password)

### 🎨 UI/UX:

```
┌─────────────────────────────────────────┐
│  Admin Dashboard                  [Ubah Password] [Logout]
└─────────────────────────────────────────┘
     ↓ Click "Ubah Password"
┌────────────────────────────────────────────────────┐
│ 🔒 Ubah Password                              [X]  │
├────────────────────────────────────────────────────┤
│                                                    │
│ Masukkan password lama dan password baru Anda     │
│                                                    │
│ Password Lama                                      │
│ ┌──────────────────────────────────────┐          │
│ │ ••••••••                             │          │
│ └──────────────────────────────────────┘          │
│                                                    │
│ Password Baru (min 6 karakter)                    │
│ ┌──────────────────────────────────────┐          │
│ │ ••••••••••••                         │          │
│ └──────────────────────────────────────┘          │
│                                                    │
│ Konfirmasi Password Baru                         │
│ ┌──────────────────────────────────────┐          │
│ │ ••••••••••••                         │          │
│ └──────────────────────────────────────┘          │
│                                                    │
│  [Batal]          [Ubah Password]                │
│                                                    │
└────────────────────────────────────────────────────┘
```

### 🔄 Alur:

```
1. Click "Ubah Password" di header
   ↓
2. Modal terbuka
   ↓
3. Input 3 field:
   - Password Lama: admin123
   - Password Baru: newPassword123
   - Konfirmasi: newPassword123
   ↓
4. Click "Ubah Password"
   ↓
5. Backend validasi:
   ✓ Semua field terisi
   ✓ New != Old
   ✓ New == Confirm
   ✓ New minimal 6 char
   ✓ Old password cocok (bcrypt verify)
   ↓
6. Hash password baru
   ↓
7. Update database
   ↓
8. Toast: "Password berhasil diubah"
   ↓
9. Auto logout (1.5 detik)
   ↓
10. Redirect ke login page
    ↓
11. Login dengan password baru: admin / newPassword123
```

### ✅ Validasi:

| #   | Validasi                    | Pesan Error                                        |
| --- | --------------------------- | -------------------------------------------------- |
| 1   | Field kosong                | "Semua field harus diisi"                          |
| 2   | Password baru ≠ Konfirmasi  | "Password baru dan konfirmasi tidak cocok"         |
| 3   | Password < 6 char           | "Password minimal 6 karakter"                      |
| 4   | New password = Old password | "Password baru harus berbeda dengan password lama" |
| 5   | Old password salah          | "Password lama tidak sesuai"                       |

---

## 📊 FITUR 2: RIWAYAT POMPA DENGAN USER TRACKING

### 🎨 UI/UX:

```
Admin Dashboard → Tab: Monitoring

┌──────────────────────────────────────────────────┐
│ Riwayat Kontrol Pompa                           │
├──────────────────────────────────────────────────┤
│                                                  │
│ [Sawah]  [Kolam]  ← Filter by Mode              │
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ Waktu│Status│Dari│Akun Admin           │  │
│ ├────────────────────────────────────────────┤  │
│ │1 Feb │ ON   │dash│Administrator        │  │
│ │10:30 │      │board│admin@example.com │  │
│ │      │      │    │                    │  │
│ ├────────────────────────────────────────────┤  │
│ │1 Feb │ OFF  │dash│Administrator        │  │
│ │09:15 │      │board│admin@example.com │  │
│ │      │      │    │                    │  │
│ ├────────────────────────────────────────────┤  │
│ │1 Feb │ ON   │dash│Administrator        │  │
│ │08:45 │      │board│admin@example.com │  │
│ │      │      │    │                    │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 📋 Kolom Riwayat:

| Kolom          | Deskripsi             | Warna          |
| -------------- | --------------------- | -------------- |
| **Waktu**      | Kapan pompa dicontrol | Default        |
| **Status**     | ON (pompa menyala)    | 🟢 Green Badge |
| **Status**     | OFF (pompa mati)      | 🔴 Red Badge   |
| **Dari**       | Source control        | Gray pill      |
| **Akun Admin** | Siapa yang kontrol    | Nama + Email   |

### 🔄 Contoh Tracking:

```
Scenario: Admin mengontrol pompa sawah

Step 1: Admin Dashboard → Tab Monitoring → Klik Switch Pompa

Step 2: Frontend kirim:
        POST /api/pump-relay
        {
          "mode": "sawah",
          "isOn": true
        }

Step 3: Backend:
        ✓ Get session → userId = "cuid_abc123"
        ✓ Update pump status
        ✓ Save ke pump_history:
          {
            mode: "sawah",
            previousState: false,
            newState: true,
            changedBy: "dashboard",
            userId: "cuid_abc123",  ← TRACKING!
            timestamp: "2026-02-01T10:30:00Z"
          }

Step 4: Admin Dashboard → Lihat Riwayat Pompa:

        Waktu      Status  Dari       Akun Admin
        1 Feb 10:30  ON    dashboard  Administrator
                                      (admin@example.com)

✅ Admin tahu siapa yang kontrol pompa!
```

### 🎯 Fitur Unggulan:

1. **User Tracking**: Setiap kontrol pompa tercatat siapa yang melakukan
2. **Real-time Update**: Riwayat terupdate otomatis setiap 10 detik
3. **Mode Filter**: Bisa filter riwayat per mode (Sawah/Kolam)
4. **Detailed Info**: Tampil nama lengkap + email admin
5. **Color Coding**: Status ON (hijau) / OFF (merah) untuk visual clarity
6. **Timestamp**: Waktu presisi (sampai detik) kapan pompa diubah

---

## 💾 DATABASE SCHEMA

### Sebelum:

```sql
pump_history {
  id: String
  mode: String              -- "sawah"/"kolam"
  previousState: Boolean
  newState: Boolean
  changedBy: String         -- "dashboard"/"esp"/"manual"
  userId: String?           -- ❌ Tidak ada relasi
  timestamp: DateTime
}
```

### Sesudah:

```sql
pump_history {
  id: String
  mode: String              -- "sawah"/"kolam"
  previousState: Boolean
  newState: Boolean
  changedBy: String         -- "dashboard"/"esp"/"manual"
  userId: String?           -- ✅ Foreign key ke User
  user: User?               -- ✅ Relasi untuk include data
  timestamp: DateTime
}

-- Relasi:
pump_history.userId → user.id
pump_history.user ← User table
  {
    id: String
    name: String
    email: String
    role: String
  }
```

---

## 🔐 KEAMANAN

### Change Password:

- ✅ Hanya admin yang login bisa akses endpoint
- ✅ Session-based authentication (NextAuth)
- ✅ Old password harus valid (bcrypt compare)
- ✅ Password di-hash sebelum simpan (bcryptjs)
- ✅ Error message generic (tidak expose username existence)

### Pump History:

- ✅ Hanya admin yang bisa akses endpoint
- ✅ userId automatically captured dari session
- ✅ Tidak bisa spoof user ID (dari backend, bukan frontend)
- ✅ Audit trail lengkap (siapa, kapan, apa)

---

## 📊 API ENDPOINTS

### 1. Change Password

```
POST /api/admin/change-password

Request:
{
  "oldPassword": "admin123",
  "newPassword": "newpass123",
  "confirmPassword": "newpass123"
}

Response (Success):
{
  "success": true,
  "message": "Password berhasil diubah"
}

Response (Error):
{
  "error": "Password lama tidak sesuai"
}

Status Codes:
- 200: Success
- 400: Validation error
- 401: Not authenticated
- 500: Server error
```

### 2. Get Pump History (Updated)

```
GET /api/pump-history?mode=sawah&limit=10&offset=0

Response:
{
  "success": true,
  "mode": "sawah",
  "data": [
    {
      "id": "history123",
      "mode": "sawah",
      "previousState": false,
      "newState": true,
      "changedBy": "dashboard",
      "timestamp": "2026-02-01T10:30:00Z",
      "user": {
        "id": "user123",
        "name": "Administrator",
        "email": "admin@example.com"
      }
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## 📌 IMPLEMENTASI DETAILS

### Files Modified:

1. **prisma/schema.prisma**
   - Added relasi User ↔ PumpHistory
   - Added indexes untuk optimization

2. **auth.ts**
   - Export authOptions (untuk reuse di endpoints)
   - Maintain existing handler/auth/signIn/signOut

3. **app/api/admin/change-password/route.ts** (NEW)
   - 5-point validation
   - Session check
   - Password hashing
   - Database update

4. **app/api/pump-relay/route.ts**
   - Import getServerSession
   - Capture userId dari session
   - Pass userId ke PumpHistory.create()

5. **app/api/pump-history/route.ts**
   - Add include: { user: { select: {...} } }
   - User data now returned in response

6. **app/admin/page.tsx**
   - Remove TabType "keamanan"
   - Add Change Password states & handler
   - Add "Ubah Password" button di header
   - Add Change Password modal dialog
   - Add Riwayat Pompa section di Monitoring tab
   - Add mode filter buttons (Sawah/Kolam)
   - Add pump history table with user info

---

## 🧪 TESTING GUIDE

### Test 1: Change Password - Success Path

```bash
1. Login: admin / admin123
2. Click "Ubah Password"
3. Enter:
   - Old: admin123
   - New: testpass123
   - Confirm: testpass123
4. Click "Ubah Password"
5. ✅ Toast: "Password berhasil diubah"
6. ✅ Auto logout (1.5s)
7. ✅ Redirect ke login
8. ✅ Login dengan admin / testpass123
```

### Test 2: Change Password - Validation Errors

```bash
1. Old password wrong
   ✅ Error: "Password lama tidak sesuai"

2. New password too short (< 6)
   ✅ Error: "Password minimal 6 karakter"

3. New != Confirm
   ✅ Error: "Password baru dan konfirmasi tidak cocok"

4. Missing field
   ✅ Error: "Semua field harus diisi"
```

### Test 3: Pump History - Tracking

```bash
1. Admin Dashboard → Monitoring
2. Scroll down → Riwayat Kontrol Pompa
3. Click switch pompa ON
4. ✅ New entry appear:
   - Waktu: current time
   - Status: ON (green)
   - Dari: dashboard
   - Akun Admin: Administrator (admin@...)

5. Click switch pompa OFF
6. ✅ New entry appear:
   - Status: OFF (red)
   - Others same as above

7. Click [Kolam] filter
8. ✅ History changes (filter applied)
```

---

## 🚀 DEPLOYMENT NOTES

### Before Deploy:

```bash
# 1. Regenerate Prisma client
npx prisma generate

# 2. Run migrations (if needed)
npx prisma migrate deploy

# 3. Test locally
npm run dev

# 4. Build
npm run build

# 5. Test production build
npm run start
```

### Environment Variables (Vercel):

```
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-here
BRIDGE_PHP_URL=http://20.2.138.40  (optional)
```

### Post-Deploy Checklist:

- [ ] Test change password end-to-end
- [ ] Verify pump history tracking works
- [ ] Check database migrations applied
- [ ] Monitor error logs
- [ ] Verify pump relay still works (ESP32 integration)

---

## 📞 SUPPORT

### Common Issues:

**Q: Change Password modal not showing?**
A: Ensure `showChangePassword` state is updated. Check browser console for errors.

**Q: Pump history empty?**
A: - Check database connection

- Verify pump_history table exists
- Try controlling pump to generate history
- Check API response in DevTools Network tab

**Q: User info not showing in history?**
A: - Verify Prisma relasi is correct

- Run `npx prisma generate`
- Check database has valid userId in pump_history records
- Restart dev server

**Q: Old password validation failing?**
A: - Ensure old password is correct (case-sensitive)

- Check bcryptjs version compatibility
- Verify password was hashed with bcryptjs on creation

---

**Last Updated**: 2026-02-01
**Status**: ✅ Production Ready
**Version**: 1.0
