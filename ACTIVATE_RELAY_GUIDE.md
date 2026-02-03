# 🚀 Quick Start - Aktivasi Relay dari Dashboard

**Status**: Integration ready  
**Time to activate**: 30-45 minutes  
**Difficulty**: Medium

---

## 📋 Executive Summary

Sistem sudah siap untuk mengontrol relay pompa dari dashboard. Flow-nya:

```
User klik Pompa ON
    ↓
Dashboard → API Vercel (/api/pump-relay)
    ↓
API Update Database + Trigger Bridge PHP
    ↓
Bridge forward ke ESP32 (HTTP/MQTT)
    ↓
ESP32 kontrol PIN_RELAY2
    ↓
Pompa Fisik Menyala ✅
```

---

## ✅ Yang Sudah Selesai

- ✅ Database schema (pump_status, pump_history)
- ✅ API endpoint `/api/pump-relay` (POST/GET)
- ✅ API endpoint `/api/pump-history` (GET dengan pagination)
- ✅ Dashboard UI (pump toggle button)
- ✅ Profile page (history modal)
- ✅ API trigger ke Bridge PHP
- ✅ Dokumentasi lengkap

---

## 🔧 Yang Perlu Dikerjakan (3 Step)

### STEP 1: Setup Bridge PHP (5 menit)

**File**: `examples/control.php`

1. Copy file ke server: `20.2.138.40/control.php`

   ```bash
   scp examples/control.php user@20.2.138.40:/var/www/html/
   ```

2. Update konfigurasi IP ESP32:

   ```php
   // Di control.php, line 15
   'http_url' => 'http://192.168.1.100:8080',  // Update IP ESP32
   ```

3. Test bridge:
   ```bash
   curl -X POST http://20.2.138.40/control.php \
     -d "action=set_pump&mode=sawah&state=1"
   ```

**Expected**: Response JSON dengan success message

---

### STEP 2: Setup Vercel Environment (3 menit)

**Di Vercel Dashboard**:

1. Settings → Environment Variables
2. Tambah variable baru:
   ```
   BRIDGE_PHP_URL=http://20.2.138.40
   ```
3. Redeploy application
4. Tunggu selesai (2-3 menit)

---

### STEP 3: Setup ESP32 (20 menit)

**Pilih Salah Satu**:

#### **Opsi A: HTTP Server pada ESP32** (Recommended - Lebih Simple)

1. Download file: `examples/esp32-http-relay-server.ino`

2. Update konfigurasi:

   ```cpp
   const char* ssid = "YOUR_SSID";
   const char* password = "YOUR_PASSWORD";
   #define PIN_RELAY2 18  // Sesuaikan dengan GPIO Anda
   ```

3. Upload ke ESP32 menggunakan Arduino IDE

4. Verify di Serial Monitor:

   ```
   Connecting to WiFi...
   WiFi connected!
   IP address: 192.168.1.100
   HTTP Server started on port 8080
   ```

5. Test endpoint:
   ```bash
   curl "http://192.168.1.100:8080/status"
   # Response: {"mode":"sawah","pump_on":false,...}
   ```

#### **Opsi B: Polling API Vercel** (Fallback - Lebih Aman)

1. Di file monitoring Anda, tambah function:

   ```cpp
   // Dari: examples/monitoring-water-ph-level-rufi.ino
   // Lihat section: "TAMBAHAN: POLLING STATUS DARI VERCEL API"
   ```

2. Panggil di loop():

   ```cpp
   checkPumpStatusFromAPI();  // Setiap 10 detik
   ```

3. Update domain:
   ```cpp
   const char* vercel_domain = "your-vercel-domain.vercel.app";
   ```

---

## 🧪 Testing End-to-End

### Test 1: API → Database

```bash
curl -X POST http://your-vercel-domain/api/pump-relay \
  -H "Content-Type: application/json" \
  -d '{"mode":"sawah","isOn":true,"changedBy":"test"}'
```

**Check**: Database updated

```sql
SELECT * FROM pump_status WHERE mode='sawah';
-- Expected: isOn = true
```

### Test 2: Database → History

```sql
SELECT * FROM pump_history WHERE mode='sawah' ORDER BY timestamp DESC LIMIT 1;
-- Expected: newState=true, changedBy=test
```

### Test 3: API → Bridge

```bash
# Check Vercel logs
# Lihat: "[BRIDGE] Mengirim perintah ke ..."
```

### Test 4: Bridge → ESP32

```bash
curl -X POST http://20.2.138.40/control.php \
  -d "action=set_pump&mode=sawah&state=1"
```

**Check**: ESP32 relay pin berubah

```
Serial Monitor: [RELAY] Pompa DIHIDUPKAN
```

### Test 5: UI Test

1. Buka dashboard
2. Klik tombol pompa
3. Verifikasi:
   - Toast notification muncul ✅
   - UI state update ✅
   - Database history tersimpan ✅
   - Relay fisik menyala ✅

---

## 📊 Troubleshooting

### Issue 1: Relay tidak menyala

```
✓ Dashboard button work?        → Check browser console
✓ API called?                    → Check Vercel logs
✓ Bridge received command?       → Check 20.2.138.40 logs
✓ ESP32 HTTP server running?    → Check Serial monitor
✓ PIN_RELAY2 configuration?     → Update GPIO number
```

**Solution**: Test setiap layer secara terpisah dengan curl

---

### Issue 2: "BRIDGE timeout"

```
[BRIDGE] Mengirim perintah ke http://192.168.1.100:8080/relay
[BRIDGE] Gagal mengirim kontrol relay
```

**Causes**:

- [ ] ESP32 offline → Cek WiFi connection
- [ ] IP salah → Verify IP di Serial monitor
- [ ] Port salah → Default 8080, verify di sketch
- [ ] Firewall → Allow port 8080

**Solution**:

```bash
# Test connectivity
ping 192.168.1.100
curl -v http://192.168.1.100:8080/status
```

---

### Issue 3: Database tidak update

```
Error: "Failed to update pump status"
```

**Causes**:

- [ ] DATABASE_URL tidak set di Vercel
- [ ] NeonDB connection timeout
- [ ] Schema belum migration

**Solution**:

```bash
# Check Vercel env vars
vercel env list

# Check NeonDB connection
# Di local: npm run build
```

---

### Issue 4: History tidak tampil di Profile

```
Modal kosong atau "Memuat..."
```

**Causes**:

- [ ] History belum ada di database
- [ ] Query timeout
- [ ] API endpoint error

**Solution**:

```sql
-- Check ada data?
SELECT COUNT(*) FROM pump_history WHERE mode='sawah';

-- Check recent?
SELECT * FROM pump_history ORDER BY timestamp DESC LIMIT 1;
```

---

## 📈 Performance Monitoring

### Vercel Logs

```bash
# View real-time logs
vercel logs your-project

# Grep untuk errors
vercel logs your-project | grep ERROR
```

### Database Monitoring

```sql
-- Check table sizes
SELECT
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

### ESP32 Serial Monitor

```
[HTTP] POST /relay received
[RELAY] Controlling relay: ON
[RELAY] ✓ Pompa DIHIDUPKAN
```

---

## 🎯 Verification Checklist

- [ ] Bridge PHP deployed ke 20.2.138.40
- [ ] BRIDGE_PHP_URL set di Vercel environment
- [ ] Vercel redeployed
- [ ] ESP32 code uploaded
- [ ] WiFi connected (lihat IP di serial)
- [ ] Test API call berhasil
- [ ] Database updated
- [ ] History terrecord
- [ ] UI toggle works
- [ ] Relay fisik menyala

---

## 🚀 Deployment Steps

1. **Vercel**:

   ```bash
   git add .
   git commit -m "Add pump relay bridge integration"
   git push origin main
   # Vercel auto-redeploy
   ```

2. **Bridge PHP** (20.2.138.40):

   ```bash
   scp examples/control.php server@20.2.138.40:/path/to/web/
   ssh server@20.2.138.40 "chmod 755 /path/to/control.php"
   ```

3. **ESP32**:
   ```
   Arduino IDE → Upload → Select ESP32 Board → Upload
   Wait for "Upload Done"
   Check Serial: "HTTP Server started on port 8080"
   ```

---

## 📞 Support Resources

| Issue              | Document                   |
| ------------------ | -------------------------- |
| API Details        | PUMP_DATABASE_MIGRATION.md |
| Bridge Integration | BRIDGE_INTEGRATION.md      |
| ESP32 Polling      | ESP32_API_POLLING.md       |
| Architecture       | SYSTEM_ARCHITECTURE.md     |
| Troubleshooting    | Check specific doc         |

---

## ✨ Next Features (Future)

- [ ] Real-time status updates via WebSocket
- [ ] Scheduled pump activation
- [ ] Pump history analytics
- [ ] Alert on abnormal pump behavior
- [ ] Multiple device support
- [ ] Admin dashboard for monitoring

---

## 🎉 Success Criteria

✅ Relay menyala saat button diklik di dashboard  
✅ History tersimpan dengan timestamp  
✅ Profile page menampilkan history  
✅ ESP32 serial monitor show kontrolnya diterima  
✅ Hardware relay fisik berfungsi

---

**Ready to launch?** 🚀

Lakukan 3 step setup di atas, test setiap layer, dan relay Anda siap dikontrol dari dashboard!
