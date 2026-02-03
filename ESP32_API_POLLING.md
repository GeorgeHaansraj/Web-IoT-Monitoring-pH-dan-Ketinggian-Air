# ESP32 Integration dengan Vercel API & Bridge PHP

## 🔄 Cara Kerja Integrasi

### Opsi 1: Push Model (Recommended - Realtime)

```
Dashboard Button → Vercel API → Bridge PHP → HTTP/MQTT → ESP32 → Relay
(Langsung kontrol hardware saat user klik)
```

### Opsi 2: Pull Model (Polling)

```
ESP32 setiap 5-10 detik → GET /api/pump-relay → Check status terbaru
Jika berubah → Control relay langsung
(Polling dari ESP32 ke API)
```

---

## 📝 Modifikasi ESP32 (Opsi 2 - Polling)

Tambahkan fungsi polling ke file `.ino` Anda:

```cpp
// --- TAMBAHAN: POLLING STATUS DARI VERCEL API ---
unsigned long lastVercelCheck = 0;
bool lastPumpStateFromAPI = false;

void checkPumpStatusFromAPI() {
  // Cek status pompa dari Vercel setiap 10 detik
  if (millis() - lastVercelCheck < 10000) return;
  lastVercelCheck = millis();

  if (!modem.isGprsConnected()) {
    Serial.println("[API] GPRS tidak terhubung, skip polling");
    return;
  }

  Serial.println("[API] >>> Polling status pompa dari Vercel...");

  TinyGsmClient gsm_client_temp(modem);
  HttpClient http_temp(gsm_client_temp, "your-vercel-domain.vercel.app", 443);
  // Atau kalau HTTP: ("your-domain.vercel.app", 80)

  http_temp.beginRequest();
  http_temp.get("/api/pump-relay?mode=sawah");
  http_temp.sendHeader("Host", "your-vercel-domain.vercel.app");
  http_temp.endRequest();

  int statusCode = http_temp.responseStatusCode();
  Serial.print("[API] Status Code: ");
  Serial.println(statusCode);

  if (statusCode == 200) {
    String response = http_temp.responseBody();
    Serial.print("[API] Response: ");
    Serial.println(response);

    // Parse JSON sederhana (tanpa library)
    // {"mode":"sawah","isOn":true,"updatedAt":"..."}

    bool isOnFromAPI = response.indexOf("\"isOn\":true") >= 0;

    Serial.print("[API] Pump state dari API: ");
    Serial.println(isOnFromAPI ? "ON" : "OFF");

    // Jika status berubah, kontrol relay
    if (isOnFromAPI != lastPumpStateFromAPI) {
      Serial.println("[API] Status berubah! Update relay...");

      if (isOnFromAPI) {
        digitalWrite(PIN_RELAY2, LOW); // Nyalakan pompa
        Serial.println("[RELAY] POMPA DIHIDUPKAN dari API");
      } else {
        digitalWrite(PIN_RELAY2, HIGH); // Matikan pompa
        Serial.println("[RELAY] POMPA DIMATIKAN dari API");
      }

      relay2State = isOnFromAPI ? LOW : HIGH;
      lastPumpStateFromAPI = isOnFromAPI;

      // Update LCD
      lcd.clear();
      lcd.print("API:");
      lcd.print(isOnFromAPI ? "POMPA ON" : "POMPA OFF");
      delay(2000);
    }
  } else {
    Serial.println("[API] Gagal polling API");
  }
}
```

---

## 🔧 Integrasi ke Loop ESP32

Di dalam fungsi `loop()` Anda, tambahkan polling:

```cpp
void loop() {
  // 1. Selalu cek tombol di awal loop agar responsif
  if (interruptTriggered) handleButtonPress();

  if (currentSysMode == MODE_MANUAL) {
    runManualMode();
  } else {
    // MODE_IOT_RUN
    maintainIoTConnection();

    // --- TAMBAHAN: CEK STATUS DARI API ---
    checkPumpStatusFromAPI();  // <-- Tambahkan baris ini
    // -------

    // ... rest of loop code
  }
}
```

---

## 🌍 Environment Variables untuk ESP32

Update konfigurasi di bagian atas sketch:

```cpp
// --- KONFIGURASI VERCEL API ---
const char* vercel_domain = "your-vercel-domain.vercel.app";
const char* vercel_api_path = "/api/pump-relay?mode=sawah";
// Ganti YOUR_VERCEL_DOMAIN dengan domain Vercel Anda

// --- KONFIGURASI BRIDGE PHP ---
const char* bridge_domain = "20.2.138.40";
const char* bridge_control_path = "/control.php";

// --- KONFIGURASI KOMUNIKASI ---
const int POLL_INTERVAL = 10000; // 10 detik
const int TIMEOUT_MS = 5000;     // 5 detik timeout
```

---

## 📊 Test Flow

### Test 1: Dashboard ke API (Vercel)

```bash
# Dari browser atau curl
POST http://your-vercel-domain/api/pump-relay
{
  "mode": "sawah",
  "isOn": true,
  "changedBy": "dashboard"
}
```

**Result**: Database updated ✅

### Test 2: ESP32 Polling API

```
ESP32 mengirim: GET /api/pump-relay?mode=sawah
API response: {"mode":"sawah","isOn":true,"updatedAt":"..."}
ESP32 parse: isOn = true
ESP32 action: digitalWrite(PIN_RELAY2, LOW) → Relay nyala
Serial output: [RELAY] POMPA DIHIDUPKAN dari API
```

### Test 3: Bridge PHP Forward

```bash
# Dari server, test bridge
curl -X POST http://20.2.138.40/control.php \
  -d "action=set_pump&mode=sawah&state=1"
```

**Result**: Relay control command sent ✅

### Test 4: End-to-End Manual

1. Klik tombol di dashboard
2. Check Vercel logs: API menerima request
3. Check Bridge logs: control.php dipanggil
4. Check ESP32 Serial: polling status berhasil
5. Check relay fisik: menyala
6. Check LCD ESP32: menampilkan status

---

## 🔍 Debugging

### Cek Koneksi GPRS

```cpp
Serial.println(modem.isGprsConnected() ? "GPRS: OK" : "GPRS: OFFLINE");
```

### Cek Parsing JSON

```cpp
String test = "{\"isOn\":true}";
Serial.println(test.indexOf("\"isOn\":true") >= 0 ? "Found" : "Not Found");
```

### Cek HTTP Response

```cpp
Serial.print("[DEBUG] Full response: ");
Serial.println(http_temp.responseBody());
```

### Monitor Pin Relay

```cpp
Serial.print("[DEBUG] PIN_RELAY2 status: ");
Serial.println(digitalRead(PIN_RELAY2) == LOW ? "ON" : "OFF");
```

---

## 🚨 Error Scenarios

### Scenario A: API Unreachable

```
[API] >>> Polling status pompa dari Vercel...
[API] Gagal polling API
→ ESP32 retry 10 detik kemudian
→ Relay tetap di state terakhir yang diketahui
```

### Scenario B: Invalid JSON Response

```
[API] Response: {"error":"Invalid request"}
→ Parsing gagal
→ Relay tetap di state terakhir
→ Log di Serial
```

### Scenario C: GPRS Offline

```
[API] GPRS tidak terhubung, skip polling
→ Polling di-skip sampai GPRS online
→ Saat GPRS online, polling resume
```

### Scenario D: Relay Already in Same State

```
[API] Pump state dari API: ON
[API] Relay state sebelumnya: ON
→ Status tidak berubah
→ Relay tidak dikontrol ulang (hemat resources)
```

---

## 📋 Integration Checklist

**Setup Backend**:

- [ ] API /api/pump-relay update database ✅ (sudah)
- [ ] API /api/pump-relay trigger Bridge ✅ (sudah)
- [ ] Create control.php di Bridge PHP
- [ ] Set BRIDGE_PHP_URL environment variable di Vercel
- [ ] Deploy ke Vercel

**Setup ESP32**:

- [ ] Tambahkan `checkPumpStatusFromAPI()` function
- [ ] Tambahkan polling di `loop()`
- [ ] Update konfigurasi domain
- [ ] Test dengan Arduino IDE Serial Monitor
- [ ] Verifikasi relay menyala saat diperintah

**Integration Test**:

- [ ] Dashboard tombol → Database update
- [ ] API polling → Relay control
- [ ] Bridge PHP forward ke ESP32
- [ ] Hardware relay menyala
- [ ] Profile page history update

---

## 🎯 Recommended Configuration

**Untuk production yang stabil**:

```
Polling Interval: 10 detik (balance antara responsif dan hemat data)
Timeout HTTP: 5 detik
Max Retries: 3
Database Query Cache: 2 menit (agar tidak query setiap detik)
```

**LED Status Indicator**:

```cpp
// Green: Relay ON & Sync dengan API
// Blue: Relay OFF & Sync dengan API
// Red: GPRS Offline atau sync error
// Blinking: Connecting...
```

---

## 📞 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    DASHBOARD (React)                    │
│                   - Pump Toggle Button                  │
│                   - Real-time Status                    │
│                   - History Modal                       │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP POST
                       ▼
         ┌─────────────────────────────────────┐
         │   VERCEL API (/api/pump-relay)      │
         │                                      │
         │  1. Update pump_status table         │
         │  2. Create pump_history record       │
         │  3. Trigger Bridge PHP               │
         └──────────┬──────────────┬────────────┘
                    │              │ HTTP POST
                    │ Stored       │ to Bridge
                    │              ▼
         ┌──────────────────────────────────────┐
         │   DATABASE (NeonDB PostgreSQL)       │
         │  - pump_status (current state)       │
         │  - pump_history (audit log)          │
         └──────────────────────────────────────┘
                                     ▲
                                     │ GET polling
                                     │ (setiap 10s)
         ┌─────────────────────────────────────┐
         │   BRIDGE PHP (20.2.138.40)           │
         │   - Receive control commands         │
         │   - Forward to ESP32 (MQTT/HTTP)    │
         │   - Update local cache               │
         └──────────┬──────────────────────────┘
                    │ MQTT/HTTP
                    ▼
         ┌──────────────────────────────────────┐
         │   ESP32 (Rufi) - IoT Device          │
         │                                      │
         │  1. Poll API status setiap 10s       │
         │  2. Receive MQTT/HTTP commands      │
         │  3. Control PIN_RELAY2               │
         │  4. Send sensor data to Bridge       │
         └──────────┬───────────────────────────┘
                    │
                    ▼
         ┌──────────────────────────────────────┐
         │   RELAY MODULE + POMPA AIR           │
         │   - Physical pump control            │
         └──────────────────────────────────────┘
```

---

## 🚀 Next Steps

1. **Buat control.php** di Bridge (lihat BRIDGE_INTEGRATION.md)
2. **Deploy API updates** ke Vercel
3. **Setup environment variables**
4. **Modifikasi ESP32 code** dengan polling function
5. **Upload ke ESP32** dan test
6. **Monitor Vercel & Bridge logs**
7. **Verify hardware relay menyala**

Semua siap untuk hardware integration! 🎉
