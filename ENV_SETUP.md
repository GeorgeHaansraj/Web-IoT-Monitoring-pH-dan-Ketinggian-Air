# Environment Variables Configuration

## 🏠 Local Development (.env.local)
```env
DATABASE_URL=postgresql://neondb_owner:npg_n9D8AOwHoixu@ep-snowy-butterfly-a12pm14d-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=KvOojE0HmaCK22dBgjid8JObnEqdHAM6abAFdMzlsL4=
```

## 🚀 Production Environment (Platform Dashboard)

### Wajib Diisi:
```env
DATABASE_URL=postgresql://...  (database production Anda)
NEXTAUTH_URL=https://your-domain.com  (JANGAN localhost!)
NEXTAUTH_SECRET=<generate-baru>  (JANGAN gunakan secret lokal!)
NODE_ENV=production
```

---

## 📋 Setup per Platform

### Vercel (https://vercel.com)
1. Dashboard → Project → Settings → Environment Variables
2. Tambah variables sesuai "Wajib Diisi"
3. Redeploy: Deployments → Redeploy

### Railway (https://railway.app)
1. Project → Variables
2. Tambah variables sesuai "Wajib Diisi"
3. Deploy otomatis

### Render (https://render.com)
1. Service → Environment
2. Add Custom Domain & Variables
3. Redeploy

### Self-Hosted / VPS
Buat `.env.production` atau set via system environment

---

## 🔐 Generate Secret Baru

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Salin output → Paste ke NEXTAUTH_SECRET di platform

---

## ✅ Verification

Login dengan credentials:
- **Phone:** 082379238544
- **Password:** admin123

Jika berhasil login → Deployment OK! ✅
