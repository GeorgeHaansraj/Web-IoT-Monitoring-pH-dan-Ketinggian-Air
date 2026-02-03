# Bridge PHP Integration Guide

## 🔗 Arsitektur Integrasi

```
Dashboard (Vercel)
    ↓ User klik tombol pompa
Dashboard sendiri HTTP POST /api/pump-relay
    ↓
API Pump-Relay (Vercel)
    ├─ Update database: pump_status, pump_history
    └─ Trigger Bridge PHP: POST http://20.2.138.40/control.php
         ↓
Bridge PHP (20.2.138.40)
    ├─ Terima perintah: action, mode, state
    └─ Forward ke ESP32 (via MQTT/Serial/HTTP)
         ↓
ESP32 (Rufi)
    ├─ Terima perintah dari Bridge
    └─ Control PIN_RELAY2 untuk Pompa Fisik
         ↓
Relay + Pompa Air (Hardware)
```

---

## 📋 Flow Lengkap

### Scenario: User Klik "Hidupkan Pompa" di Dashboard

```
1. Frontend (Dashboard)
   - User klik tombol pump toggle
   - State: sawahPumpOn = true

2. HTTP POST /api/pump-relay
   Body: {
     "mode": "sawah",
     "isOn": true,
     "changedBy": "dashboard"
   }

3. Backend API (/api/pump-relay)
   a) Cek current status dari database
      → previousState = false (pompa OFF)

   b) Update pump_status table
      UPDATE pump_status
      SET isOn = true, updatedAt = NOW()
      WHERE mode = 'sawah'

   c) Create history record
      INSERT INTO pump_history (...)
      VALUES ('sawah', false, true, 'dashboard', ...)

   d) Trigger Bridge:
      POST http://20.2.138.40/control.php
      Body: action=set_pump&mode=sawah&state=1

4. Bridge PHP (control.php)
   a) Terima request dari Vercel API
   b) Parse: action="set_pump", mode="sawah", state="1"
   c) Validate & update local database
   d) Forward ke ESP32 (MQTT topic atau HTTP endpoint)
      Contoh MQTT: publish("esp32/sawah/relay", "1")
      Contoh HTTP: POST http://esp32-ip:8080/relay?mode=sawah&state=1

5. ESP32 (Rufi)
   a) Subscribe MQTT atau polling HTTP endpoint
   b) Terima perintah: POMPA_ON
   c) digitalWrite(PIN_RELAY2, LOW) → Hidupkan relay
   d) Update status lokal: relay2State = LOW
   e) Tampilkan di LCD: "POMPA ON"

6. Hardware
   Relay + Pompa fisik menyala
```

---

## 🔌 Setup Bridge PHP

### File: control.php

Buat file baru di 20.2.138.40 dengan nama `control.php`:

```php
<?php
// control.php - Middleware antara Vercel API dan ESP32

header('Content-Type: application/json');

// 1. Validasi request dari Vercel
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(400);
    echo json_encode(['error' => 'POST method required']);
    exit;
}

// 2. Parse input dari Vercel API
$action = $_POST['action'] ?? null;
$mode = $_POST['mode'] ?? 'sawah';
$state = $_POST['state'] ?? '0';

error_log("[BRIDGE] Menerima dari Vercel: action=$action, mode=$mode, state=$state");

// 3. Handle aksi SET_PUMP
if ($action === 'set_pump') {
    // OPSI A: Kirim ke ESP32 via MQTT
    // (Sesuaikan dengan setup MQTT Anda)
    // $topic = "esp32/{$mode}/relay";
    // $message = $state === '1' ? "POMPA_ON" : "POMPA_OFF";
    // publish_to_mqtt($topic, $message);

    // OPSI B: Kirim ke ESP32 via HTTP langsung
    // (Jika ESP32 punya HTTP server)
    $esp32_url = "http://YOUR_ESP32_IP:8080/relay";
    $post_data = http_build_query([
        'mode' => $mode,
        'state' => $state
    ]);

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/x-www-form-urlencoded',
            'content' => $post_data,
            'timeout' => 5
        ]
    ]);

    $response = @file_get_contents($esp32_url, false, $context);

    if ($response === false) {
        error_log("[BRIDGE] ESP32 unreachable");
        http_response_code(504);
        echo json_encode(['error' => 'ESP32 tidak terhubung']);
    } else {
        error_log("[BRIDGE] ESP32 merespon: $response");
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Relay dikontrol']);
    }
}

// 4. Handle aksi GET_STATUS (untuk ESP32 polling)
elseif ($action === 'get_status') {
    // Query database atau cache untuk status pompa
    // Return: {"mode": "sawah", "pump_on": true}

    // Contoh dummy:
    http_response_code(200);
    echo json_encode([
        'mode' => $mode,
        'pump_on' => ($state === '1'),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}

else {
    http_response_code(400);
    echo json_encode(['error' => 'Unknown action']);
}

// Helper function (Optional)
/*function publish_to_mqtt($topic, $message) {
    // Implementasi MQTT publish ke broker Anda
    // Contoh menggunakan mosquitto_pub atau library PHP MQTT
    // shell_exec("mosquitto_pub -h broker.emqx.io -t '$topic' -m '$message'");
}*/
?>
```

---

## 🔧 Konfigurasi Environment

### Di Vercel (Environment Variables)

Tambahkan:

```
BRIDGE_PHP_URL=http://20.2.138.40
```

### Di ESP32 (Optional, untuk polling)

```cpp
// Di dalam loop()
// Setiap 10 detik, cek status pump dari Vercel
if (currentMillis - lastStatusCheck > 10000) {
    lastStatusCheck = currentMillis;

    // GET dari Vercel API
    String url = "http://your-vercel-domain/api/pump-relay?mode=sawah";
    http.begin(url);
    int httpCode = http.GET();

    if (httpCode == 200) {
        String response = http.getString();
        // Parse JSON dan ambil isOn
        // Jika isOn berubah, control relay
    }
}
```

---

## 🧪 Testing

### Test 1: Dashboard ke API (Vercel)

```bash
curl -X POST http://localhost:3000/api/pump-relay \
  -H "Content-Type: application/json" \
  -d '{"mode":"sawah","isOn":true,"changedBy":"dashboard"}'
```

**Expected**: Status 200, database updated

### Test 2: API ke Bridge PHP

```bash
curl -X POST http://20.2.138.40/control.php \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "action=set_pump&mode=sawah&state=1"
```

**Expected**: Response dari PHP bridge, ESP32 menerima perintah

### Test 3: ESP32 ke Hardware

- Cek apakah PIN_RELAY2 berubah ke LOW (relay menyala)
- Monitor Serial output: `[SYSTEM] Menerima Perintah: NYALAKAN POMPA!`

### Test 4: End-to-End

1. Klik tombol di dashboard
2. Lihat database pump_status update
3. Lihat history record dibuat
4. Lihat relay menyala di hardware
5. Profile page tampilkan history dengan source "dashboard"

---

## 🔒 Security Considerations

### Current (Development)

- ✅ Database persisted
- ⚠️ No authentication on Bridge
- ⚠️ No HTTPS (HTTP only)

### Production Recommendations

1. **Authenticate** request dari Vercel:

   ```php
   $api_key = $_POST['api_key'] ?? null;
   if ($api_key !== getenv('API_KEY_FROM_VERCEL')) {
       http_response_code(401);
       exit('Unauthorized');
   }
   ```

2. **Use HTTPS** untuk Bridge

   ```php
   // Enforce HTTPS
   if (empty($_SERVER['HTTPS']) || $_SERVER['HTTPS'] === 'off') {
       header('Location: https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI']);
       exit;
   }
   ```

3. **Rate Limiting** di Bridge

   ```php
   // Cegah spam
   $cache_key = 'relay_' . $mode;
   $last_change = apcu_fetch($cache_key);
   if ($last_change && time() - $last_change < 2) {
       http_response_code(429);
       exit('Too many requests');
   }
   ```

4. **Whitelist IP** dari Vercel (jika perlu)
   ```php
   $allowed_ips = ['vercel-ip-range'];
   if (!in_array($_SERVER['REMOTE_ADDR'], $allowed_ips)) {
       http_response_code(403);
       exit('Forbidden');
   }
   ```

---

## 🚨 Error Handling

### Scenario A: Bridge tidak terhubung

```
Dashboard → API (OK)
API → Bridge (FAIL - timeout)
Database updated ✅
Relay tetap OFF ❌

Solusi: ESP32 tetap bisa polling status dari API
```

### Scenario B: ESP32 offline

```
Dashboard → API (OK)
API → Bridge (OK)
Bridge → ESP32 (FAIL - tidak ada respon)
Database updated ✅
Relay tetap OFF ❌

Solusi: Esp32 akan sync status saat online kembali via polling
```

### Scenario C: Database error

```
Dashboard → API (OK)
API update database (FAIL)
API → Bridge (tidak sampai)
Relay tetap OFF ❌

Solusi: User lihat error di dashboard, bisa retry
```

---

## 📊 Monitoring

### Check Bridge Status

```bash
# Vercel logs (via dashboard.vercel.com)
# Lihat: "[BRIDGE] Mengirim perintah ke ..."
# Lihat: "[BRIDGE] Response: ..."

# Server logs (20.2.138.40)
tail -f /var/log/apache2/error.log
# Atau di control.php:
error_log("[BRIDGE] ...")
```

### Check ESP32 Status

```
Serial Monitor ESP32:
[SYSTEM] Menerima Perintah: NYALAKAN POMPA!
```

### Check Database

```sql
-- Check latest pump status
SELECT * FROM pump_status WHERE mode = 'sawah';

-- Check history
SELECT * FROM pump_history WHERE mode = 'sawah' ORDER BY timestamp DESC LIMIT 10;
```

---

## 📝 Integration Checklist

- [ ] Create `control.php` di 20.2.138.40
- [ ] Set `BRIDGE_PHP_URL` environment variable di Vercel
- [ ] Test API endpoint dengan curl
- [ ] Test Bridge PHP dengan request manual
- [ ] Test end-to-end: Dashboard → API → Bridge → ESP32
- [ ] Monitor logs untuk debug
- [ ] Verify pump_history records created
- [ ] Check relay fisik menyala
- [ ] Add HTTPS untuk production
- [ ] Add API key authentication

---

## 🎯 Next Steps

1. **Buat control.php** dengan konfigurasi yang sesuai setup Anda
2. **Deploy ke 20.2.138.40**
3. **Update Vercel environment variables**
4. **Redeploy dashboard**
5. **Test** tombol pompa dari dashboard

Siap untuk testing? 🚀
