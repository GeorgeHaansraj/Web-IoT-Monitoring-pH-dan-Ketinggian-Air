# 🆘 Masih STAGED? - Complete Fix Guide

## 🔴 Jika Deployment STAGED (Build OK tapi tidak running)

Kemungkinan issue:
- Prisma client error saat runtime
- Database timeout
- Missing environment variables
- Health check failing

---

## ✅ NUCLEAR RESET - Langkah Lengkap

### **1️⃣ Clear Vercel Cache**

Go to Vercel Dashboard:
```
Settings → Storage → Caches → Clear All
```

### **2️⃣ Delete Staged Deployment**

```
Deployments → Select STAGED deployment → Delete
```

### **3️⃣ Triple-Check Environment Variables**

Pastikan di **Settings → Environment Variables** ada PERSIS:

```
DATABASE_URL = postgresql://neondb_owner:npg_n9D8AOwHoixu@ep-snowy-butterfly-a12pm14d-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

NEXTAUTH_URL = https://your-exact-vercel-domain.vercel.app
(JANGAN ada typo, HARUS https://)

NEXTAUTH_SECRET = <any-long-random-string>  
(Bisa di-generate ulang: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

NODE_ENV = production
```

**Penting:** Pastikan **tidak ada typo**, **tidak ada spasi useless**

### **4️⃣ Force Redeploy dari CLI**

Dari local terminal:
```bash
cd d:\proyek-web\dashboard-monitoring-iot
git push origin main
```

Atau redeploy manual:
```
Vercel Dashboard → Deployments → Latest → Redeploy (bukan Retry!)
```

### **5️⃣ Monitor Build Logs**

Tunggu ~5 menit, lihat logs:
```
Deployments → Click latest build → View Logs
```

Cari error messages, screenshot kalau ada yang merah.

---

## 🔍 Common "Staged" Causes

### **Cause 1: Database Connection**
```
Error: Cannot connect to PostgreSQL

Solution: 
- Check DATABASE_URL di Neon console
- Test: psql "your-database-url"
- Pastikan connection pooler diaktifkan
```

### **Cause 2: NEXTAUTH_SECRET**
```
Error: JWT error / Session error

Solution:
- Generate ulang secret: 
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
- Update di Vercel Env Vars
- Redeploy
```

### **Cause 3: Node Version**
```
Vercel default may use old Node version

Solution:
- Create .nvmrc file with: 20
- Or set di vercel.json: "engines": { "node": "20" }
```

### **Cause 4: Prisma Client**
```
Error: PrismaClient not generated

Solution:
- Add to package.json postinstall: "prisma generate"
- Vercel akan otomatis run saat install
```

---

## 📝 Vercel.json - Simple Version

Saat ini sudah di-simplify. Jika masih error, gunakan:

```json
{
  "outputDirectory": ".next"
}
```

(Vercel will auto-detect Next.js dan gunakan default settings)

---

## 🧪 Manual Test Local Build

```bash
npm ci
npm run build
npm run start
```

Buka: http://localhost:3000/login

Jika bisa login lokal → issue hanya saat Vercel deploy

---

## 📞 Debug Checklist

Jika masih STAGED:

1. [ ] Vercel cache cleared
2. [ ] ALL 4 env vars ada di dashboard
3. [ ] No typo di NEXTAUTH_URL (must be exact domain)
4. [ ] Redeploy dari CLI / Vercel (not just Retry)
5. [ ] Waited 5+ minutes untuk complete
6. [ ] Checked Build Logs untuk error message

---

## 🆘 Jika Masih Gagal

Share:
1. **Exact error message** dari Vercel logs screenshot
2. **Environment Variables** values (blur sensitive stuff)
3. **Database**: Neon? atau lain? 
4. **Build log** dari "View Logs" - first 50 lines dan last 50 lines

---

**Jangan stress! Issue ini 90% environment variable problem. Biasanya clear cache + redeploy = OK! ✅**
