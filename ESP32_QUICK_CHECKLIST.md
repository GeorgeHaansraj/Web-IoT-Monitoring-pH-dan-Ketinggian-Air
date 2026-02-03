# Quick Implementation Checklist - ESP32 IoT Integration

## 📋 Hardware Requirement

- [ ] ESP32 Dev Board
- [ ] SIM800L GSM Module (baud rate: 9600)
- [ ] Voltage Divider: R1=30kΩ, R2=7.5kΩ untuk pin 34 (battery)
- [ ] Relay Module untuk control pompa
- [ ] pH Sensor + Water Level Sensor
- [ ] SIM card dengan paket data (cukup 1-2MB/hari untuk polling)

---

## 🔌 Pin Configuration

```cpp
// GSM Module
#define RX_GSM 26
#define TX_GSM 27

// Relays
#define PIN_RELAY1 4   // Main relay (system on/off)
#define PIN_RELAY2 18  // Pump relay

// Sensors
#define PIN_PH 36      // pH sensor (ADC)
#define PIN_BATT 34    // Battery voltage (ADC) - via voltage divider
#define PIN_TRIG 5     // Ultrasonic trigger
#define PIN_ECHO 19    // Ultrasonic echo

// Buttons (optional)
#define BTN_SAWAH 32
#define BTN_KOLAM 25
```

---

## 📝 Code Changes Required

### 1️⃣ Add Sensor Reading Functions

Copy-paste ke ESP32 code (sebelum `void loop()`):

```cpp
// ======== REAL SENSOR READINGS ========

int getSignalQuality() {
  int csq = modem.getSignalQuality();
  return (csq == 99) ? 0 : csq;
}

float getBatteryVoltage() {
  long totalRaw = 0;
  for (int i = 0; i < 10; i++) {
    totalRaw += analogRead(34);
    delay(10);
  }
  float voltage = (totalRaw / 10.0 / 4095.0) * 3.3 * 5.0;
  if (voltage < 3.2) voltage = 3.2;
  if (voltage > 4.2) voltage = 4.2;
  return voltage;
}

int getBatteryPercentage(float voltage) {
  if (voltage >= 4.2) return 100;
  if (voltage <= 3.2) return 0;
  return (int)((voltage - 3.2) / (4.2 - 3.2) * 100);
}

bool getPumpStatus() {
  return digitalRead(PIN_RELAY1) == HIGH;  // Adjust PIN as needed
}
```

### 2️⃣ Update JSON Payload

Dalam `sendToVercel()` function, ubah JSON:

```cpp
// BEFORE (hardcoded):
String payload = "{\"ph\":" + String(phValue) + ",\"battery\":100,...}";

// AFTER (real values):
StaticJsonDocument<512> doc;
doc["device_id"] = "ESP32-KKN-01";
doc["ph"] = readRawPH() + calibrationOffset;
doc["battery"] = getBatteryPercentage(getBatteryVoltage());
doc["signal"] = getSignalQuality();
doc["pump_status"] = getPumpStatus();  // ⭐ FEEDBACK
doc["level"] = readWaterLevel();
doc["location"] = "sawah";

String jsonPayload;
serializeJson(doc, jsonPayload);
```

### 3️⃣ Parse Command Response

```cpp
String response = client.responseBody();

StaticJsonDocument<256> responseDoc;
if (deserializeJson(responseDoc, response) == DeserializationError::Ok) {
  String command = responseDoc["command"] | "OFF";

  if (command == "ON") {
    digitalWrite(PIN_RELAY1, HIGH);
    Serial.println("[RELAY] ON");
  } else if (command == "OFF") {
    digitalWrite(PIN_RELAY1, LOW);
    Serial.println("[RELAY] OFF");
  }
}
```

### 4️⃣ Loop Frequency

Jangan polling terlalu cepat (hemat data):

```cpp
// ⚠️ JANGAN lakukan tiap detik
// ✅ LAKUKAN tiap 20-30 detik

unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 20000; // 20 detik

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - lastSendTime > SEND_INTERVAL &&
      modem.isGprsConnected()) {
    sendToVercel("/api/input-enhanced.php", "ESP32-KKN-01");
    lastSendTime = currentMillis;
  }
}
```

---

## 💾 Database & Backend

### 1️⃣ Migration Status

✅ Already Applied:

```
20260201191430_add_device_controls_model
```

Check with:

```bash
npx prisma migrate status
```

### 2️⃣ Verify API Endpoints

```bash
# Test GET device control
curl http://localhost:3000/api/device-control?mode=sawah

# Test PUT device control
curl -X PUT http://localhost:3000/api/device-control \
  -H "Content-Type: application/json" \
  -d '{"command":"ON","mode":"sawah"}'
```

---

## 🧪 Testing Steps

### Phase 1: Hardware Test

```
1. Upload ESP32 code
2. Open Serial Monitor (115200 baud)
3. Check:
   [SIGNAL] CSQ: 15 (0-31)
   [BATTERY] Voltage: 3.85V
   [PUMP] Status: OFF
```

### Phase 2: Network Test

```
1. Check GPRS connection:
   modem.isGprsConnected() == true
2. Check SSL/TLS (jika HTTPS):
   modem.sendAT("+CSSLCFG=\"sslversion\",0")
```

### Phase 3: Data Flow Test

```
1. ESP32 send POST → Check PHP logs
2. PHP insert → Check NeonDB monitoring_logs
3. Dashboard GET /api/device-control → Should see state
4. Dashboard PUT → Should update device_controls
5. ESP32 next poll → Should receive command
6. Relay execute → Check PIN status
```

### Phase 4: End-to-End Test

```
Sequence:
A. Dashboard UI: Click "ON"
   ↓
B. Database: device_controls { command: "ON" }
   ↓
C. ESP32 polling (20 detik): POST sensor + pump_status: false
   ↓
D. PHP Bridge: SELECT command → respond "ON"
   ↓
E. ESP32: digitalWrite(PIN_RELAY1, HIGH)
   ↓
F. ESP32 next poll: pump_status: true (feedback)
   ↓
G. Dashboard: Show "POMPA HIDUP" + Signal: 28/31 + Battery: 88%
   ↓
H. Dashboard UI: Click "OFF"
   ↓
[Repeat reverse]
```

---

## 📊 Monitoring Metrics

### Expected Values

| Metric       | Min | Max | Notes             |
| ------------ | --- | --- | ----------------- |
| Signal (CSQ) | 0   | 31  | 28+ = excellent   |
| Battery %    | 0   | 100 | 3.2V-4.2V Li-ion  |
| pH           | 0   | 14  | Calibrated ±0.5   |
| Water Level  | 0   | 200 | cm (dengan sonar) |
| Poll Latency | 10s | 40s | Network dependent |

### Key Logs to Monitor

```
[SIGNAL] CSQ: 25  ✅ Good
[BATTERY] Voltage: 4.1V  ✅ Good
[HTTP] Response Code: 200  ✅ Success
[RELAY] ON  ✅ Command executed
[PUMP] Status: true  ✅ Feedback received
```

---

## ⚠️ Common Issues & Fixes

| Issue                                 | Cause                                  | Solution                                   |
| ------------------------------------- | -------------------------------------- | ------------------------------------------ |
| `Parsing ecmascript failed`           | Syntax error dalam JSON                | Validate JSON dengan JSONLint              |
| `Bridge returned 404`                 | URL salah atau server down             | Check IP dan routing                       |
| `Pump tidak nyala padahal command ON` | GPIO error atau relay rusak            | Test relay dengan digitalWrite langsung    |
| `Battery % selalu 0%`                 | Voltage divider tidak terpasang        | Gunakan multimeter check voltage di pin 34 |
| `Signal CSQ: 99`                      | Belum dapat sinyal atau SIM card error | Tunggu 30 detik, cek SIM card              |
| `Pump status mismatch (DB vs GPIO)`   | Relay state tidak sync                 | Baca GPIO saat kirim, jangan dari cache    |

---

## 📱 Mobile-Friendly Monitoring

Fitur yang sudah ada di dashboard:

- ✅ Real-time pump status
- ✅ Battery percentage display
- ✅ Signal quality indicator
- ✅ Water level gauge
- ✅ pH trend graph
- ✅ Command history

Akses via: `http://<ip>:3000/` atau mobile-optimized

---

## 🔒 Security Checklist

- [ ] Input sanitasi di PHP (done di input-enhanced.php)
- [ ] SQL injection prevention (prepared statements)
- [ ] Authentication required untuk PUT /api/device-control (NextAuth session)
- [ ] Rate limiting pada API endpoints (add if needed)
- [ ] Command expiry (2 hours implemented)
- [ ] HTTPS for production (SSL certificate required)

---

## 📞 Support & Debugging

### Serial Monitor Output Format

```
Expected healthy output:
[INIT] Modem OK
[INIT] Cari Sinyal...
[INIT] Sinyal OK
[SIGNAL] CSQ: 25
[BATTERY] Voltage: 3.95V
[HTTP] >>> MEMULAI PENGIRIMAN...
[HTTP] Response Code: 200
[HTTP] Command from Bridge: ON
[RELAY] ON

Red flags:
- "Modem tidak merespon!" → Power/TX-RX issue
- "No Signal!" → SIM card or antenna issue
- "Bridge returned 404" → URL configuration
- "JSON parse gagal" → Response format issue
```

### Database Query for Debugging

```sql
-- Check latest command
SELECT * FROM device_controls
WHERE mode='sawah'
ORDER BY updated_at DESC LIMIT 1;

-- Check monitoring data
SELECT * FROM monitoring_logs
WHERE device_id='ESP32-KKN-01'
ORDER BY created_at DESC LIMIT 10;

-- Check pump status feedback
SELECT * FROM pump_status
WHERE mode='sawah';
```

---

## 🚀 Production Checklist

- [ ] Voltage divider installed & calibrated
- [ ] Relay tested & working
- [ ] GSM antenna connected
- [ ] SIM card active with data plan
- [ ] PHP bridge URL configured correctly
- [ ] Database connection stable
- [ ] API endpoints tested (GET/PUT device-control)
- [ ] Poll interval set to 20s (not faster)
- [ ] Command expiry set to 2 hours
- [ ] Serial monitoring active for first 48 hours
- [ ] Backup power supply (if applicable)

---

**Last Updated:** February 2, 2025
**Version:** 1.0
**Status:** Ready for production deployment
