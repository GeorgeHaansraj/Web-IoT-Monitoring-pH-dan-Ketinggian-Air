# 🔍 pH Real-time Debugging - Tidak Match LCD vs Dashboard

**Issue**: Dashboard menunjukkan 6.5-7.5, tapi LCD ESP32 menunjukkan pH 4

**Root Cause**: **ESP32 belum mengirim data ke `/api/ph` endpoint**

---

## 🎯 Diagnosis

### Apa yang terjadi:

1. ✅ LCD ESP32: Menampilkan pH 4 (sensor bekerja)
2. ✅ API `/api/ph-latest`: Siap menerima data
3. ❌ Database: Kosong (belum terima data dari ESP32)
4. ❌ Dashboard: Menampilkan default value 7.37 (karena no data di DB)

### Bukti:

```bash
# Check database
curl http://localhost:3000/api/ph-latest?location=sawah
# Response SEBELUM: value: null (kosong)

# Inject test data
curl -X POST http://localhost:3000/api/ph-test \
  -d '{"value": 4.0, "location": "sawah"}'
# Response: success

# Check database SESUDAH
curl http://localhost:3000/api/ph-latest?location=sawah
# Response SESUDAH: value: 4 (✓ berhasil)

# Dashboard seharusnya otomatis update dalam 5 detik
```

---

## ✅ Solusi

### 1. Verify ESP32 Kirim Data dengan Benar

**ESP32 harus melakukan HTTP POST ke `/api/ph`:**

```cpp
// YANG HARUS DILAKUKAN ESP32:

void sendPHToDatabase(float phValue) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    // 1. Setup connection ke API
    String apiUrl = "https://YOUR_DOMAIN.com/api/ph";
    // ATAU jika local testing:
    // String apiUrl = "http://192.168.x.x:3000/api/ph";

    http.begin(apiUrl);
    http.addHeader("Content-Type", "application/json");

    // 2. Prepare JSON payload
    String jsonPayload = "{";
    jsonPayload += "\"value\":" + String(phValue, 2) + ",";
    jsonPayload += "\"location\":\"sawah\",";
    jsonPayload += "\"deviceId\":\"ESP32-001\",";
    jsonPayload += "\"temperature\":28.5";
    jsonPayload += "}";

    // 3. Send POST request
    int httpResponseCode = http.POST(jsonPayload);

    Serial.print("[PH] POST /api/ph → ");
    Serial.println(httpResponseCode == 200 ? "✓ OK" : "✗ FAILED");
    Serial.println("JSON: " + jsonPayload);

    http.end();
  }
}

// Call every 10-30 seconds:
sendPHToDatabase(4.0);  // Ganti dengan sensor reading
```

**Checklist ESP32:**

- [ ] WiFi connected (check SSID & password)
- [ ] API URL correct (point ke domain Vercel atau IP local)
- [ ] JSON format valid (value, location, deviceId)
- [ ] HTTP POST method digunakan (bukan GET)
- [ ] Content-Type: application/json header ada

---

### 2. Test dengan Manual Injection

**Gunakan endpoint `/api/ph-test` untuk test:**

```bash
# Test 1: Inject pH 4 untuk Sawah
curl -X POST http://localhost:3000/api/ph-test \
  -H "Content-Type: application/json" \
  -d '{"value": 4.0, "location": "sawah", "deviceId": "TEST"}'

# Response:
{
  "success": true,
  "message": "Test pH data injected",
  "data": {
    "value": 4,
    "location": "sawah",
    "timestamp": "2026-01-31T07:31:02.750Z"
  }
}

# Test 2: Check apakah dashboard akan fetch
curl http://localhost:3000/api/ph-latest?location=sawah

# Response: value: 4 ✓

# Test 3: Dashboard harus update dalam 5 detik
# Open browser: http://localhost:3000
# Lihat "pH Real-time" card → harus menunjukkan 4
```

---

### 3. Debug Info Endpoint

**Gunakan `/api/ph-test` GET untuk lihat semua data:**

```bash
curl http://localhost:3000/api/ph-test | jq .

# Response:
{
  "debug": {
    "totalReadings": 5,
    "latestReadings": [
      {
        "id": "...",
        "value": 4,
        "location": "sawah",
        "timestamp": "2026-01-31T07:31:02.750Z",
        "deviceId": "TEST"
      },
      // ... more readings
    ],
    "latestByLocation": {
      "sawah": { "value": 4, ... },
      "kolam": null
    }
  }
}
```

---

## 📋 Checklist - Troubleshooting

### ❌ Dashboard masih menunjukkan default (7.37)?

**Langkah 1: Verify database kosong**

```bash
curl http://localhost:3000/api/ph-test | jq '.debug.latestByLocation'

# Jika response: {"sawah": null, "kolam": null}
# → Database kosong, ESP32 belum kirim apa-apa
```

**Langkah 2: Inject test data**

```bash
curl -X POST http://localhost:3000/api/ph-test \
  -H "Content-Type: application/json" \
  -d '{"value": 4.0, "location": "sawah"}'
```

**Langkah 3: Wait 5 detik, refresh dashboard**

- Dashboard harus update ke 4.0
- Jika masih 7.37 → cache issue atau polling tidak berjalan

**Langkah 4: Check browser console**

```javascript
// Open DevTools (F12) → Console
// Cari logs [PH-REALTIME]

// Expected:
[PH-REALTIME] Updated sawah pH: 4 from database
```

---

### ❓ LCD menunjukkan pH 4, tapi Dashboard 6.5-7.5?

**Diagnosis:**

1. **ESP32 sensor bekerja** ✓ (LCD akurat)
2. **ESP32 belum send ke API** ✗ (HTTP POST tidak terjadi)

**Verifikasi:**

```cpp
// Add di ESP32 code untuk debug:

void setup() {
  Serial.begin(115200);

  // ... WiFi setup ...

  Serial.println("WiFi Status: " + String(WiFi.status()));
  Serial.println("IP: " + WiFi.localIP().toString());
}

void loop() {
  float phValue = readPHSensor();  // Dari sensor, LCD tampil ini
  Serial.println("pH from sensor: " + String(phValue, 2));

  // PROBLEM: Apakah ini dipanggil?
  sendPHToDatabase(phValue);

  delay(30000);  // Wait 30 detik sebelum kirim lagi
}
```

**Perbaikan:**

- Pastikan `sendPHToDatabase()` function dipanggil
- Pastikan WiFi connected
- Pastikan API URL correct

---

## 🧪 Test Scenarios

### Scenario 1: Local Testing (tanpa ESP32)

**Test bahwa system bekerja:**

```bash
# 1. Clear database (optional)
# (Skip kalau ada data lain yang penting)

# 2. Inject pH 4
curl -X POST http://localhost:3000/api/ph-test \
  -d '{"value": 4.0, "location": "sawah"}'

# 3. Check API
curl http://localhost:3000/api/ph-latest?location=sawah
# → value: 4 ✓

# 4. Open http://localhost:3000 di browser
# → pH Real-time card harus menunjukkan 4 dalam 5 detik

# 5. Inject pH 7
curl -X POST http://localhost:3000/api/ph-test \
  -d '{"value": 7.0, "location": "sawah"}'

# 6. Refresh browser (atau wait 5 detik polling)
# → pH Real-time harus berubah ke 7 ✓
```

**Result**: Jika test ini berhasil, system OK. Masalah ada di ESP32.

---

### Scenario 2: ESP32 Integration Testing

**Test dari ESP32 langsung:**

```cpp
// 1. Add test code di ESP32 setup:
void testPHSending() {
  Serial.println("[TEST] Sending pH 4.0...");
  sendPHToDatabase(4.0);

  delay(2000);

  Serial.println("[TEST] Sending pH 7.0...");
  sendPHToDatabase(7.0);

  delay(2000);

  Serial.println("[TEST] Sending pH 9.5...");
  sendPHToDatabase(9.5);
}

// 2. Call di setup():
void setup() {
  // ... WiFi & init ...

  testPHSending();  // Kirim test data
}
```

**Expected Output di Serial Monitor:**

```
[TEST] Sending pH 4.0...
[HTTP] POST /api/ph → 201 CREATED

[TEST] Sending pH 7.0...
[HTTP] POST /api/ph → 201 CREATED

[TEST] Sending pH 9.5...
[HTTP] POST /api/ph → 201 CREATED
```

**Expected di Dashboard:**

- pH Real-time card akan menampilkan 9.5 (latest value)
- Historical graph akan punya 3 data points

---

## 📊 Data Flow - Verification

```
┌─────────────────────────────────────────────────────┐
│ ESP32 SENSOR READING (LCD: 4.0)                     │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ ESP32 HTTP POST /api/ph                             │
│ {value: 4.0, location: "sawah"}                     │
│                                                      │
│ ❓ Is this happening?                               │
│ Check Serial output, check network traffic          │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ API /api/ph - Validate & Insert                     │
│ Database: INSERT INTO ph_readings VALUES (4.0, ...) │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ Neon PostgreSQL - ph_readings table                 │
│ Latest: {value: 4.0, timestamp: now}                │
└──────────────┬──────────────────────────────────────┘
               │
               ▼ (Every 5 seconds)
┌─────────────────────────────────────────────────────┐
│ Dashboard useEffect → fetch /api/ph-latest          │
│ Response: {value: 4.0}                              │
│ setState: setSawahPH(4.0)                           │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ DASHBOARD DISPLAY: 4.0 ✓                            │
└─────────────────────────────────────────────────────┘
```

**Problem adalah di step pertama**: ESP32 belum kirim data ke API.

---

## ✅ Resolution Steps

1. **Check ESP32 code** - pastikan `sendPHToDatabase()` dipanggil
2. **Verify WiFi** - pastikan ESP32 connected ke WiFi
3. **Test locally** - gunakan `/api/ph-test` untuk inject test data
4. **Verify API** - check `/api/ph-latest` mengembalikan correct value
5. **Monitor Dashboard** - open browser, wait max 5 detik untuk update

---

## 💡 Summary

| Component            | Status            | Issue                       |
| -------------------- | ----------------- | --------------------------- |
| ESP32 Sensor         | ✅ Works (LCD: 4) |                             |
| ESP32 WiFi           | ?                 | Need to verify              |
| ESP32 HTTP Send      | ❌ Not happening  | **Need to check code**      |
| API `/api/ph`        | ✅ Ready          |                             |
| Database             | ✅ Ready          | No data received            |
| API `/api/ph-latest` | ✅ Works          | Returns null if no data     |
| Dashboard Code       | ✅ Correct        | Polling works, but DB empty |
| Dashboard Display    | ❌ Shows default  | Because DB empty            |

**Action Item**: Check ESP32 firmware - ensure `sendPHToDatabase()` is being called after WiFi connects!
