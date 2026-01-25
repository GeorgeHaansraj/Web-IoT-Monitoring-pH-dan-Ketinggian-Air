# Debug Endpoints

Gunakan endpoints ini untuk troubleshooting aplikasi:

## 1. Health Check

```
http://localhost:3000/api/health
```

Cek apakah API working.

## 2. Database Check

```
http://localhost:3000/api/debug/db
```

Cek koneksi Prisma ke database.

## 3. Session Debug

```
http://localhost:3000/api/debug/session
```

Cek status NextAuth session.

## Testing Flow

1. **Cek Health:**

   ```
   http://localhost:3000/api/health
   → Should return: { "status": "ok", "message": "API is working" }
   ```

2. **Cek Database:**

   ```
   http://localhost:3000/api/debug/db
   → Should return: { "message": "Database is working", "count": N }
   ```

   - Jika error = Database tidak connected

3. **Cek Session:**

   ```
   http://localhost:3000/api/debug/session
   → Should return: { "session": null } (jika belum login)
   ```

   - Jika error = NextAuth problem

4. **Test Login:**
   - Go to http://localhost:3000/login
   - Enter valid credentials
   - Check browser console for errors

## Troubleshooting

### 404 Not Found

- App tidak bisa diakses
- **Solution**:
  ```bash
  npm run dev
  # atau
  npm run build
  npm start
  ```

### JSON Parse Error

- NextAuth returning invalid response
- **Solution**:
  - Check `/api/debug/session`
  - Check `/api/debug/db`
  - Restart server: `npm run dev`

### Database Error

- Prisma connection failed
- **Solution**:
  - Check `.env.local` for DATABASE_URL
  - Check database connection
  - Run: `npx prisma migrate dev`

## After Troubleshooting

Delete or comment out `/api/debug/*` endpoints before deployment.

## Quick Test

In browser console:

```javascript
fetch("/api/health")
  .then((r) => r.json())
  .then(console.log);
```

Should see: `{status: 'ok', message: 'API is working'}`
