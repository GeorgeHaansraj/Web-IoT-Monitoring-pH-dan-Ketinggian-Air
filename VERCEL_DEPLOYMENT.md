# 🚀 Vercel Deployment - Complete Setup Guide

## ⚠️ Jika Masih Error "Deployment Failed"

Follow checklist ini **step by step**:

---

## ✅ STEP 1: Vercel Project Configuration

Di **Vercel Dashboard → Your Project → Settings**:

### 1.1 Environment Variables
Add semua ini:

```
DATABASE_URL = postgresql://...  (dari Neon)
NEXTAUTH_URL = https://your-project.vercel.app
NEXTAUTH_SECRET = <generated-value>
NODE_ENV = production
```

**Note:** NEXTAUTH_URL harus HTTPS dan domain production Anda!

### 1.2 Build & Output Settings
- Framework Preset: **Next.js**
- Build Command: **`npm run build`** (biarkan default)
- Output Directory: **`.next`** (biarkan default)
- Install Command: **`npm ci`** (biarkan default)

### 1.3 Postgres / Database Settings
**WAJIB:** Database connection string harus accessible dari Vercel:
- Test di local: `psql "postgresql://..."`
- Jika error, kemungkinan IP whitelist di database provider

---

## ✅ STEP 2: Fix Potential Build Issues

Run locally untuk pastikan build clean:

```bash
npm ci
npm run build
```

Jika ada error, fix terlebih dahulu sebelum push ke Vercel.

---

## ✅ STEP 3: Database Migration

**IMPORTANT:** Database harus ter-migrate di production!

### Option A: Manual Migration via Terminal
```bash
# Dari local terminal, run migration di production DB
npx prisma db push

# Atau jika ingin preview migration
npx prisma db push --show-database-url --skip-generate
```

### Option B: Auto Migration (Recommended)
Saya sudah buat `build.sh` yang auto-run migration saat deploy. 
Vercel akan otomatis menggunakan ini.

---

## ✅ STEP 4: Test Deployment

1. **Push ke main:**
   ```bash
   git push origin main
   ```

2. **Vercel akan auto-deploy** (check Deployments tab)

3. **Tunggu build complete** (~2-5 menit)

4. **Lihat logs:**
   - Deployments → Latest → View Build Logs
   - Lihat apakah ada error saat migration

5. **Test aplikasi:**
   - https://your-project.vercel.app/login
   - Login dengan: `082379238544` / `admin123`
   - Akses: https://your-project.vercel.app/admin

---

## 🔍 Debugging: Cek Error Details

### Cara lihat error log di Vercel:

1. Go to: **Deployments → Latest Failed Deployment**
2. Click: **View Build Logs** (atau View Runtime Logs)
3. Scroll down untuk lihat error message
4. Common errors:

| Error | Solusi |
|-------|--------|
| `NEXTAUTH_URL not set` | Set di Environment Variables |
| `Cannot connect to database` | Check DATABASE_URL, test koneksi |
| `Prisma.PrismaClient is not defined` | Run `npx prisma generate` |
| `Permission denied` | Check database user permissions |
| `timeout` | Database connection pooling issue |

---

## 🔧 Jika Masih Error: Nuclear Option

### Reset Everything:

1. **Vercel Dashboard → Project Settings → Danger Zone → Delete Project**

2. **Re-import project:**
   - Go to: vercel.com/new
   - Import from GitHub
   - Select your repo
   - Framework: Next.js
   - Environment Variables: isi semua (DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET)
   - Deploy

3. **Fresh build tanpa cache**

---

## 📋 Complete Environment Variables List

Copy-paste semua ini ke Vercel Environment Variables:

```
DATABASE_URL="postgresql://neondb_owner:npg_n9D8AOwHoixu@ep-snowy-butterfly-a12pm14d-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
NEXTAUTH_URL="https://your-project.vercel.app"
NEXTAUTH_SECRET="<hasil-generate-baru>"
NODE_ENV="production"
SKIP_ENV_VALIDATION="true"
```

Generate NEXTAUTH_SECRET baru:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🚨 Jika Masih Stadig Error

Share screenshot:
1. **Error message lengkap** dari Vercel Build Logs
2. **Environment Variables** yang sudah di-set (blur sensitive info)
3. **Output dari:**
   ```bash
   npx prisma db execute --stdin --file=/dev/stdin << 'EOF'
   SELECT version();
   EOF
   ```

Dengan info itu saya bisa debug lebih spesifik!

---

## ✅ Verifikasi Deployment OK

- [ ] Can access https://your-domain.vercel.app
- [ ] Login page bisa diakses
- [ ] Login dengan `082379238544` / `admin123` berhasil
- [ ] Dashboard admin bisa diakses
- [ ] API monitoring-log return data
- [ ] No error di browser console

**Jika semua checkmark ✅ → Deployment SUCCESS!**
