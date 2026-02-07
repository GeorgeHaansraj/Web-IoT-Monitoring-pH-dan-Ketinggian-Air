# 🚀 Deployment Guide - Setup Production Environment

## ⚠️ Penyebab Error "Promotion Staged"

Error ini biasanya terjadi karena **Environment Variables tidak dikonfigurasi** di platform deployment Anda.

---

## 📋 Checklist Sebelum Deploy

### 1. **Database** ✅
- [ ] DATABASE_URL sudah dikonfigurasi di platform deployment
- [ ] Database accessible dari production server
- [ ] Run migration di production: `npx prisma db push`

### 2. **NextAuth Configuration** ✅
**INI YANG PALING PENTING!**

```env
# UNTUK PRODUCTION - UBAH INI!
NEXTAUTH_URL=https://your-domain.com  # ← UBAH KE DOMAIN PRODUCTION ANDA!
NEXTAUTH_SECRET=generate-new-value    # ← GENERATE BARU!
```

### 3. **Generate NEXTAUTH_SECRET Baru**

Jangan gunakan secret yang ada di `.env` lokal untuk production!

```bash
# Generate di terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🔧 Setup di Platform Deployment

### **Untuk Vercel:**
1. Go to: `Settings → Environment Variables`
2. Add semua variables dari list di bawah:

```
DATABASE_URL = [copy dari Neon/platform]
NEXTAUTH_URL = https://your-project.vercel.app  (otomatis dari Vercel)
NEXTAUTH_SECRET = [hasil generate baru]
```

3. Redeploy setelah add variables

### **Untuk Railway/Render:**
1. Go to project dashboard
2. Settings → Environment
3. Add variables sama seperti di atas
4. Deploy ulang (redeploy)

### **Untuk Self-Hosted (VPS/Akmal):**
1. Setting `.env` di production server:
```bash
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=[generated value]
```

2. Run:
```bash
npm run build
npm run start
```

---

## 🔑 Environment Variables yang Diperlukan

```env
# DATABASE
DATABASE_URL=postgresql://user:password@host/db

# NEXTAUTH (WAJIB untuk production)
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generated-secret>

# Optional - untuk debugging
NODE_ENV=production
```

---

## ✅ Verifikasi Deployment

Setelah deploy:

1. **Buka URL production** → `/login`
2. **Login dengan:**
   - Phone: `082379238544`
   - Password: `admin123`
3. **Pergi ke `/admin`** - harus bisa akses dashboard

---

## 🆘 Troubleshooting

### Error: "NEXTAUTH_URL not set"
**Solusi:** Set `NEXTAUTH_URL` ke domain production Anda

### Error: "Cannot connect to database"
**Solusi:** Check `DATABASE_URL` - pastikan database accessible dari production server

### Error: "Session error" saat login
**Solusi:** Generate ulang `NEXTAUTH_SECRET` dan set di platform

### Build error di platform
**Solusi:** 
```bash
# Bersihkan cache dan rebuild
npm ci
npm run build
```

---

## 📝 Contoh Setup Vercel

```
Project: dashboard-monitoring-iot
Domain: dashboard-monitoring-iot.vercel.app

Environment Variables:
- DATABASE_URL = postgresql://...
- NEXTAUTH_URL = https://dashboard-monitoring-iot.vercel.app
- NEXTAUTH_SECRET = 6f8a9b2c...
```

Then: Settings → Deployments → Redeploy

---

## 🎯 Quick Fix untuk Saat Ini

1. **Identify platform deployment Anda** (Vercel? Railway? Render?)
2. **Set environment variables:**
   ```
   NEXTAUTH_URL = https://your-production-url.com
   NEXTAUTH_SECRET = [generate baru]
   DATABASE_URL = [copy dari platform DB Anda]
   ```
3. **Redeploy**
4. **Test login di production**

---

Jika masih error, share:
- Platform deployment apa yang Anda gunakan?
- Error message lengkap apa yang muncul?
- Screenshot environment variables setting di platform?
