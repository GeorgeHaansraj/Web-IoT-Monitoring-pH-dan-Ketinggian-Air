# 📱 ESP32 Firmware Setup - Baca & Kirim pH ke Dashboard

**Issue**: ESP32 baca pH 6.8 di LCD, tapi dashboard masih menampilkan 4 (default value)

**Penyebab**: Firmware ESP32 belum punya code untuk kirim pH ke API `/api/ph`

**Solusi**: Update firmware dengan kode lengkap yang sudah saya siapkan

---

## ✅ Firmware Lengkap

File: [examples/esp32-complete-ph-sender.ino](../examples/esp32-complete-ph-sender.ino)

**Fitur:**

- ✅ Baca sensor pH analog (GPIO A0)
- ✅ Tampilkan di LCD I2C 16x2 (otomatis rotate display)
- ✅ Kirim HTTP POST ke `/api/ph` setiap 10 detik
- ✅ Monitor WiFi status
- ✅ Monitor battery voltage
- ✅ Kontrol relay pompa

---

## 🔧 Setup Steps

### Step 1: Download Firmware

Copy file [esp32-complete-ph-sender.ino](../examples/esp32-complete-ph-sender.ino)

### Step 2: Update Konfigurasi

**Buka file di Arduino IDE, cari bagian:**

```cpp
// KONFIGURASI WiFi - ← GANTI INI
const char* SSID = "YOUR_WIFI_SSID";              // Ganti dengan WiFi SSID
const char* PASSWORD = "YOUR_WIFI_PASSWORD";       // Ganti dengan password

// KONFIGURASI API - ← GANTI INI
const char* API_PH_URL = "https://YOUR_DOMAIN.com/api/ph";  // Update domain
const char* LOCATION = "sawah";  // atau "kolam" sesuai lokasi device

// Optional: Untuk local testing
// const char* API_PH_URL = "http://192.168.1.100:3000/api/ph";
```

**Perlu di-update:**

```
SSID               → WiFi network name
PASSWORD           → WiFi password
API_PH_URL         → https://your-domain.com/api/ph (Vercel) atau http://IP:3000/api/ph (lokal)
LOCATION           → "sawah" atau "kolam"
```

### Step 3: Install Library (jika belum ada)

Di Arduino IDE:

- Sketch → Include Library → Manage Libraries
- Cari: `LiquidCrystal I2C` → Install
- Cari: `ArduinoJson` → Install (versi 6.x)

### Step 4: Select Board

- Tools → Board → esp32 → ESP32 Dev Module
- Tools → Port → Pilih COM port ESP32

### Step 5: Upload

- Klik Upload (arrow button)
- Monitor → Serial Monitor (115200 baud)
- Lihat log untuk verify

---

## 📋 Expected Output

**Serial Monitor (115200 baud):**

```
=== ESP32 IoT Monitoring - Sawah/Kolam ===
Initializing...

[WiFi] Connecting to SSID_NAME
...................
✓ WiFi connected!
IP: 192.168.1.105

✓ Setup complete!

[pH] Analog: 512 → pH: 7.00
[API] Sending pH to: https://your-domain.com/api/ph
[API] Payload: {"value":7.0,"location":"sawah","deviceId":"ESP32-001","temperature":25.0}
✓ pH sent successfully! (Code: 201)
  Location: sawah
  pH: 7.00

[pH] Analog: 514 → pH: 7.05
[API] Sending pH to: https://your-domain.com/api/ph
✓ pH sent successfully! (Code: 201)
```

**LCD Display (rotate setiap 5 detik):**

```
Mode 1:
┌────────────────┐
│pH: 7.00  sawah │
│Device: ESP32-01│
└────────────────┘

Mode 2:
┌────────────────┐
│WiFi: OK        │
│Battery: 85%    │
└────────────────┘

Mode 3:
┌────────────────┐
│API: Sending... │
│Interval: 10s   │
└────────────────┘
```

---

## 🔌 Hardware Wiring

### Sensor pH

```
PH Sensor Module:
  GND  → GND ESP32
  VCC  → +5V (via buck converter dari battery)
  A0   → GPIO A0 (ADC pin 0)

Note: Sensor butuh voltage stabil 4.7-5.2V
```

### LCD I2C (16x2)

```
LCD Module:
  GND  → GND ESP32
  VCC  → +5V (via buck converter)
  SDA  → GPIO 21 (I2C data)
  SCL  → GPIO 22 (I2C clock)
```

### Relay Pompa (optional)

```
Relay Module:
  GND  → GND ESP32
  VCC  → +5V
  IN   → GPIO 16 (relay control)
  NO   → Connect ke pompa (normally open)
```

---

## 🚀 Testing

### Test 1: Local Testing (tanpa ESP32)

**Inject test data ke database:**

```bash
curl -X POST http://localhost:3000/api/ph-test \
  -H "Content-Type: application/json" \
  -d '{"value": 6.8, "location": "sawah"}'
```

**Check dashboard:**

- Open http://localhost:3000
- pH Real-time harus menunjukkan 6.8 dalam 5 detik

### Test 2: ESP32 Upload & Run

1. Upload firmware ke ESP32
2. Buka Serial Monitor (115200)
3. Lihat log untuk verify pH sending
4. Open dashboard, wait 10-20 detik
5. pH Real-time harus update ke value terbaru

### Test 3: Continuous Monitoring

```
Timeline:
10:00:00 - ESP32 baca pH 6.8
10:00:01 - Kirim ke API
10:00:02 - Save ke database
10:00:05-10 - Dashboard fetch terbaru
10:00:11 - Display update ke 6.8 ✓

10:00:10 - ESP32 baca pH 7.1
10:00:11 - Kirim ke API
...
10:00:21 - Display update ke 7.1 ✓
```

---

## 📊 Data Flow

```
ESP32 Sensor (baca setiap polling)
    ↓
Baca analog dari pH sensor
    ↓
Convert ke pH (0-1023 → 0-14)
    ↓
LCD display (update setiap 1 detik)
    ↓ (setiap 10 detik)
HTTP POST /api/ph
    ↓
Neon Database → ph_readings table
    ↓ (polling setiap 5 detik dari dashboard)
GET /api/ph-latest
    ↓
Dashboard → React State → Display ✓
```

---

## ⚙️ Konfigurasi & Calibration

### Sensor pH Calibration

Default formula di code:

```cpp
currentPH = (analogValue / 1023.0) * 14.0;
```

Ini generic dan perlu fine-tuning di lapangan:

**Step 1: Measure analog value di known pH**

```cpp
// Uncomment ini di setup() untuk debug:
void printAnalogValues() {
  for(int i = 0; i < 100; i++) {
    Serial.println(analogRead(PH_SENSOR_PIN));
    delay(100);
  }
}
```

**Step 2: Calibrate dengan formula:**

```
Jika di pH 7 (neutral), analog read = 512
Jika di pH 4 (asam), analog read = 284
Jika di pH 10 (basa), analog read = 740

Formula linear: pH = 7 + (analogValue - 512) * (14/1024)
```

### WiFi & API URL

Pastikan format URL correct:

```cpp
// Vercel Production
const char* API_PH_URL = "https://your-dashboard.vercel.app/api/ph";

// Local testing
const char* API_PH_URL = "http://192.168.1.100:3000/api/ph";

// Testing via bridge
const char* API_PH_URL = "http://20.2.138.40:3000/api/ph";
```

**Test connection:**

```bash
# From ESP32 Serial Monitor, verify WiFi:
[WiFi] Connecting to YOUR_SSID
✓ WiFi connected!
IP: 192.168.1.105

# Then verify API reachable:
[API] Sending pH to: https://your-domain.com/api/ph
✓ pH sent successfully!
```

---

## 🐛 Troubleshooting

### ❌ WiFi tidak connect

**Verify:**

```
- Cek SSID & password benar
- Cek ESP32 dalam range WiFi
- Cek firewall tidak block 2.4GHz
```

**Fix:**

```cpp
// Add di setup() untuk debug:
Serial.println("WiFi Status: " + String(WiFi.status()));
// Status 3 = connected, status lain = error
```

### ❌ API POST gagal (HTTP 400/500)

**Verify:**

```
- Cek API_PH_URL format correct
- Cek domain/IP accessible dari ESP32
- Cek JSON payload valid
```

**Debug:**

```cpp
// Check response dari API:
String response = http.getString();
Serial.println("API Response: " + response);
```

### ❌ pH nilai tidak berubah

**Kemungkinan:**

```
1. Sensor tidak terhubung (A0 pin floating)
   → Check wiring

2. Sensor broken
   → Test dengan multimeter

3. Analog value stabil di 512 (tengah)
   → Kalibrate sensor
```

### ❌ LCD tidak tampil

**Verify:**

```
- Cek SDA (GPIO21) & SCL (GPIO22) terhubung
- Cek LCD address (default 0x27)
- Cek +5V power (jangan 3.3V)

Cek address dengan I2C scanner:
  Search "i2c_scanner" di Arduino examples
```

---

## 📈 Monitoring

### Check di Dashboard

```
1. Open http://localhost:3000 (atau domain Vercel)
2. Lihat "pH Real-time" card
3. Value harus update setiap 5 detik (setelah polling)
4. Lihat "pH History" graph untuk trend
```

### Check di Serial Monitor

```
Serial Monitor → Baud 115200
Lihat [API] logs untuk verify sending
```

### Check di Database

```bash
curl http://localhost:3000/api/ph-test

# Response: lihat latestByLocation.sawah.value
# Harus sama dengan LCD reading ±0.5
```

---

## 🎯 Success Criteria

**Firmware siap ketika:**

✅ Serial Monitor menunjukkan:

- WiFi connected dengan IP
- [API] Sending message setiap 10 detik
- ✓ pH sent successfully! dengan HTTP 201

✅ LCD menampilkan:

- pH value yang berubah
- WiFi status OK
- Device info

✅ Dashboard menunjukkan:

- pH Real-time update dalam 10-20 detik
- Value match dengan LCD ±0.5
- History graph accumulating data

✅ Database punya data:

- curl /api/ph-test return non-null values
- Timestamp update setiap 10 detik

---

## 📝 File References

| File                                                                         | Purpose                          |
| ---------------------------------------------------------------------------- | -------------------------------- |
| [esp32-complete-ph-sender.ino](../examples/esp32-complete-ph-sender.ino)     | **← USE THIS** Complete firmware |
| [esp32-pump-relay-http.ino](../examples/esp32-pump-relay-http.ino)           | Reference for relay control      |
| [arduino-water-level-sensor.ino](../examples/arduino-water-level-sensor.ino) | Reference for water level        |

---

## 💡 Next Steps

1. **Update firmware** dengan esp32-complete-ph-sender.ino
2. **Configure WiFi & API URL** sesuai environment
3. **Upload ke ESP32** dan verify di Serial Monitor
4. **Wait 10-20 detik** lalu check dashboard
5. **Verify data** di database dengan curl /api/ph-test
6. **Monitor trend** di pH History graph

---

## ✨ Expected Result

```
LCD ESP32: pH 6.8 ✓
API /api/ph-latest: pH 6.8 ✓
Dashboard: pH 6.8 ✓
Database: timestamp updated every 10s ✓

ALL MATCH! 🎉
```
