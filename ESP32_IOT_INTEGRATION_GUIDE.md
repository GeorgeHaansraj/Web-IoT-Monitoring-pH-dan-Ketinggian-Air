# Integrasi ESP32 + SIM800L → PHP Bridge → NeonDB → Next.js Dashboard

## Overview Arsitektur

```
┌─────────────────┐
│ ESP32 + SIM800L │
│    (Hardware)   │
└────────┬────────┘
         │ HTTP POST (Sensor Data + Pump Status)
         ▼
┌──────────────────────┐
│ PHP Bridge           │
│ input-enhanced.php   │
└────────┬─────────────┘
         │ INSERT into PostgreSQL
         ▼
┌──────────────────────────────┐
│ NeonDB PostgreSQL            │
│ - monitoring_logs            │
│ - device_controls (Command)  │
│ - pump_status                │
└────────┬─────────────────────┘
         │ HTTP GET (from Next.js Dashboard)
         ▼
┌─────────────────────────────┐
│ Next.js Dashboard           │
│ /api/device-control (REST)  │
│ /api/pump-relay (Control)   │
└─────────────────────────────┘
```

## 1. ESP32 Side: Data Collection & State Synchronization

### 1.1 Hardware Setup

**Required Components:**

- ESP32 Dev Board
- SIM800L GSM Module
- Voltage Divider (R1=30kΩ, R2=7.5kΩ) untuk baca baterai
- Relay Module (untuk kontrol pompa)
- Sensors: pH, Water Level, Battery

**Koneksi:**

```
ESP32 Pin 26  ─────► SIM800L RX
ESP32 Pin 27  ─────► SIM800L TX
ESP32 Pin 34  ◄─────┬─ R1 (30kΩ)
                     │
                   Baterai (+)
                   (through R2)
ESP32 GND   ─────► SIM800L GND
```

### 1.2 Sensor Reading Functions

Tambahkan functions berikut ke ESP32 code (sebelum loop):

```cpp
// ======== REAL SENSOR READINGS ========

/**
 * Read actual signal quality (CSQ: 0-31)
 * 0 = weakest, 31 = strongest, 99 = unknown
 */
int getSignalQuality() {
  int csq = modem.getSignalQuality();
  Serial.print("[SIGNAL] CSQ: ");
  Serial.println(csq);
  return (csq == 99) ? 0 : csq;  // Default 0 if unknown
}

/**
 * Read actual battery voltage
 * Assuming: Voltage Divider ratio = 5.0
 * Maps 3.2V-4.2V Li-ion to 0-100%
 */
float getBatteryVoltage() {
  long totalRaw = 0;
  int samples = 10;

  // Ambil multiple samples
  for (int i = 0; i < samples; i++) {
    totalRaw += analogRead(34);  // Battery ADC pin
    delay(10);
  }

  float avgRaw = totalRaw / (float)samples;

  // Konversi ke voltage (asumsi voltage divider 5x)
  float voltage = (avgRaw / 4095.0) * 3.3 * 5.0;

  // Limit range ke 3.2V - 4.2V
  if (voltage < 3.2) voltage = 3.2;
  if (voltage > 4.2) voltage = 4.2;

  Serial.print("[BATTERY] Voltage: ");
  Serial.print(voltage);
  Serial.println("V");

  return voltage;
}

/**
 * Calculate battery percentage dari voltage
 * Li-ion 3.2V = 0%, 4.2V = 100%
 */
int getBatteryPercentage(float voltage) {
  if (voltage >= 4.2) return 100;
  if (voltage <= 3.2) return 0;

  int percent = (int)((voltage - 3.2) / (4.2 - 3.2) * 100);
  return constrain(percent, 0, 100);
}

/**
 * Read actual pump relay status
 * Check GPIO pin yang connect ke relay
 */
bool getPumpStatus() {
  bool isOn = digitalRead(PIN_RELAY1) == HIGH;  // Adjust pin accordingly
  Serial.print("[PUMP] Status: ");
  Serial.println(isOn ? "ON" : "OFF");
  return isOn;
}
```

### 1.3 JSON Payload Structure (sendData Function)

Ubah JSON yang dikirim ke PHP bridge:

```cpp
void sendToVercel(String endpoint, String deviceId) {
  // 1. BACA SENSOR ASLI (bukan hardcoded)
  float phValue = readRawPH() + calibrationOffset;
  float batteryVolt = getBatteryVoltage();
  int batteryPercent = getBatteryPercentage(batteryVolt);
  int signalQuality = getSignalQuality();  // 0-31
  bool pumpIsOn = getPumpStatus();          // true/false
  float waterLevel = readWaterLevel();      // cm

  // 2. BUILD JSON PAYLOAD
  StaticJsonDocument<512> doc;
  doc["device_id"] = deviceId;
  doc["ph"] = phValue;
  doc["battery"] = batteryPercent;  // Percentage (0-100)
  doc["signal"] = signalQuality;    // CSQ (0-31)
  doc["pump_status"] = pumpIsOn;    // true/false - FEEDBACK
  doc["level"] = waterLevel;        // cm
  doc["location"] = currentLocLabel;  // "sawah" atau "kolam"
  doc["timestamp"] = millis() / 1000;  // Unix seconds

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // 3. KIRIM KE BRIDGE
  Serial.println("[HTTP] Sending payload:");
  Serial.println(jsonPayload);

  http.beginRequest();
  http.post(endpoint);
  http.sendHeader("Content-Type", "application/json");
  http.sendHeader("Content-Length", jsonPayload.length());
  http.beginBody();
  http.print(jsonPayload);
  http.endRequest();

  int statusCode = http.responseStatusCode();
  String response = http.responseBody();

  // 4. PARSE RESPONSE JSON
  Serial.print("[HTTP] Response Code: ");
  Serial.println(statusCode);
  Serial.print("[HTTP] Response Body: ");
  Serial.println(response);

  if (statusCode == 200) {
    StaticJsonDocument<256> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);

    if (!error) {
      String command = responseDoc["command"] | "OFF";
      String device = responseDoc["device_id"] | "";

      Serial.print("[HTTP] Command from Bridge: ");
      Serial.println(command);

      // 5. EKSEKUSI COMMAND
      if (command == "ON") {
        digitalWrite(PIN_RELAY1, HIGH);
        Serial.println("[RELAY] Relay nyala (from command)");
      } else if (command == "OFF") {
        digitalWrite(PIN_RELAY1, LOW);
        Serial.println("[RELAY] Relay mati (from command)");
      }

      lastSendTime = millis();  // Update last send time
    } else {
      Serial.println("[ERROR] JSON parse gagal");
    }
  }
}
```

### 1.4 Loop Integration

Panggil sendToVercel setiap 20-30 detik:

```cpp
void loop() {
  // ... existing code ...

  unsigned long currentMillis = millis();

  // Polling interval: 20 detik untuk stabilitas GSM
  if (currentMillis - lastSendTime > 20000 && modem.isGprsConnected()) {
    // PENTING: Pastikan relay status sudah ter-update sebelum kirim
    // Jangan baca relay HANYA dari database, baca dari GPIO saat ini

    sendToVercel("/api/input-enhanced.php", "ESP32-KKN-01");
  }
}
```

---

## 2. PHP Bridge Side: State Validation & Command Delivery

File: `examples/input-enhanced.php` (sudah dibuat)

**Alur:**

1. Terima POST dari ESP32 dengan sensor data + pump_status feedback
2. Validasi dan sanitasi input
3. INSERT ke `monitoring_logs`, `water_level_readings`
4. UPDATE `pump_status` dengan feedback dari ESP32
5. QUERY `device_controls` untuk command terbaru
6. CHECK command expiry (> 2 jam = expired → OFF)
7. Balas JSON response dengan command

**Penting:**

- Command berbasis **STATE** bukan **TRIGGER**
- Jika database bilang ON, ya ON terus sampai ada command OFF
- Jika command lama (>2 jam), default ke OFF untuk safety

---

## 3. Next.js Dashboard Side: Command Management

### 3.1 GET Device Control (read current state)

```typescript
// app/api/device-control/route.ts (sudah dibuat)

// GET /api/device-control?mode=sawah
// Response: { command: "ON" | "OFF", updated_at: "...", age_seconds: 45 }
```

### 3.2 PUT Device Control (write new command)

```typescript
// PUT /api/device-control
// Body: { command: "ON", mode: "sawah" }
// Response: { success: true, command: "ON" }
```

### 3.3 Dashboard Integration (React)

Di `app/page.tsx` atau `app/admin/page.tsx`:

```typescript
// Update existing state-based control
const handlePumpToggle = async () => {
  const newCommand = isPumpOn ? "OFF" : "ON";

  // 1. UPDATE database dengan command baru
  const res = await fetch("/api/device-control", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      command: newCommand,
      mode: mode,
      reason: `User clicked ${newCommand} button`,
    }),
  });

  const data = await res.json();
  if (data.success) {
    console.log("[PUMP] Command sent:", newCommand);
    // Polling otomatis akan ambil state dari DB
  }
};

// Polling untuk ambil command state terbaru
const fetchPumpStatus = async () => {
  const res = await fetch(`/api/device-control?mode=${mode}`);
  const data = await res.json();

  if (data.success) {
    setPumpOn(data.command === "ON");
    // ESP32 akan baca command ini saat polling
  }
};

// Run polling setiap 5 detik
useEffect(() => {
  const interval = setInterval(fetchPumpStatus, 5000);
  return () => clearInterval(interval);
}, [mode]);
```

---

## 4. Database Schema

### 4.1 MonitoringLog

```sql
- id (cuid)
- ph_value (float)
- battery_level (float) -- percentage 0-100
- signal_strength (int)  -- CSQ 0-31, NEW!
- level (float)          -- water level cm
- temperature (float)    -- optional
- created_at (timestamp)
- deviceId (string)      -- e.g., "ESP32-KKN-01"
```

### 4.2 DeviceControl (NEW!)

```sql
- id (cuid)
- command (string)  -- "ON", "OFF", "STANDBY"
- mode (string)     -- "sawah", "kolam"
- deviceId (string) -- null untuk global, "ESP32-..." untuk specific
- actionBy (string) -- User email or "system"
- updatedAt (timestamp)
- createdAt (timestamp)

UNIQUE: (deviceId, mode)
INDEX: updatedAt
```

### 4.3 PumpStatus

```sql
- mode (string @unique)     -- "sawah" atau "kolam"
- isOn (boolean)            -- current state
- isManualMode (boolean)    -- manual vs timed
- pumpDuration (int)        -- hours (1, 2, 3 untuk timed)
- pumpStartTime (timestamp) -- when turned ON
- updatedAt (timestamp)
```

---

## 5. Command Lifecycle

### Scenario 1: User Clicks "ON" Button

```
1. Dashboard PUT /api/device-control
   Body: { command: "ON", mode: "sawah" }
   ↓
2. Next.js INSERT/UPDATE device_controls
   UPDATE device_controls SET command='ON', updated_at=NOW()
   WHERE mode='sawah'
   ↓
3. ESP32 polling (tiap 20 detik)
   POST /bridge/input-enhanced.php
   Body: { ph: 6.5, battery: 85, signal: 28, pump_status: false, ... }
   ↓
4. PHP Bridge check device_controls
   SELECT command FROM device_controls WHERE mode='sawah'
   → Response: { command: "ON", ... }
   ↓
5. ESP32 parse response dan execute
   if (response["command"] == "ON") {
     digitalWrite(PIN_RELAY, HIGH);  // nyalakan pompa
   }
   ↓
6. ESP32 polling berikutnya (20 detik kemudian)
   Kirim pump_status: true (feedback ke dashboard)
   PHP INSERT pump_status dengan is_on=true
   ↓
7. Dashboard polling /api/device-control
   Lihat command="ON" dan pump_status=true
   UI menampilkan: Pompa NYALA (dengan feedback dari hardware)
```

### Scenario 2: Command Expiry (Safety)

```
1. User klik "ON" pukul 10:00
   Database: command="ON", updated_at=2025-02-01 10:00:00

2. ESP32 tidak polling selama 2.5 jam (network down atau power issue)

3. ESP32 reconnect dan polling pukul 12:30
   PHP check: age_seconds = (12:30 - 10:00) = 9000 detik > 7200 detik
   → Command expired!
   → PHP balas: { command: "OFF" }  // Safety: default OFF

4. ESP32 terima OFF dan nyalakan relay OFF
   (Pompa tidak akan tetap hidup karena command expired)
```

### Scenario 3: Multiple ESP32 Devices

```
device_controls table:
┌─────────────────────────────────────┐
│ id  │ deviceId      │ mode   │ command │
├─────┼───────────────┼────────┼─────────┤
│ 1   │ ESP32-KKN-01  │ sawah  │ ON      │
│ 2   │ ESP32-KKN-02  │ kolam  │ OFF     │
│ 3   │ NULL          │ sawah  │ ON      │  ← fallback global
└─────────────────────────────────────┘

Query priority:
1. SELECT command FROM device_controls
   WHERE deviceId='ESP32-KKN-01' AND mode='sawah'  ← highest priority
2. If not found, SELECT WHERE deviceId=NULL AND mode='sawah'  ← global
3. If not found, default OFF  ← safety
```

---

## 6. Testing Checklist

### 6.1 PHP Bridge Testing

```bash
# Test POST dengan curl
curl -X POST http://localhost/bridge/input-enhanced.php \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "ESP32-TEST",
    "ph": 6.5,
    "battery": 85,
    "signal": 25,
    "pump_status": false,
    "level": 45,
    "location": "sawah"
  }'

# Expected response:
# { "success": true, "command": "OFF", "device_id": "ESP32-TEST", ... }
```

### 6.2 Dashboard Testing

```typescript
// Test device-control API
1. PUT /api/device-control
   Body: { command: "ON", mode: "sawah" }
   → Should update database

2. GET /api/device-control?mode=sawah
   → Should return command: "ON"

3. Wait 20 seconds (ESP polling interval)

4. Check monitoring_logs
   → Should see latest pump_status feedback
```

### 6.3 End-to-End Testing

```
1. Start ESP32 dan connect GSM
2. Open Dashboard
3. Click "ON" button
4. Check ESP32 serial:
   [HTTP] Command from Bridge: ON
   [RELAY] Relay nyala
5. After 20 seconds, check Dashboard:
   Pump status should show: NYALA + signal quality + battery %
6. Click "OFF" button
7. Repeat steps 4-5 with OFF state
```

---

## 7. Known Issues & Solutions

### Issue: Bridge returns 404

**Cause:** URL tidak sesuai atau server tidak running
**Solution:**

```
- Gunakan IP lokal untuk testing
- Pastikan input-enhanced.php di path yang benar
- Check nginx/Apache routing
```

### Issue: ESP32 tidak dapat parsing JSON response

**Cause:** Response format tidak sesuai dengan ArduinoJson library
**Solution:**

```cpp
// Pastikan response minimal:
{ "success": true, "command": "OFF" }

// Jangan ada field tambahan yang tidak perlu (hemat memory)
```

### Issue: Pump status tidak update di dashboard

**Cause:** `pump_status` dalam JSON tidak dikirim atau FALSE positif
**Solution:**

```cpp
// Selalu baca GPIO LIVE, jangan dari cache
bool pumpIsOn = digitalRead(PIN_RELAY1) == HIGH;  // Live read

// Kirim dalam JSON
doc["pump_status"] = pumpIsOn;
```

---

## 8. Summary Implementasi

✅ **PHP Bridge** → Accept signal_strength, pump_status → Return state-based command
✅ **Database** → DeviceControl model untuk command persistence
✅ **ESP32** → Read real sensor values → Send feedback → Execute command
✅ **Next.js** → PUT command → Polling sync → Display real-time status
✅ **Safety** → Command expiry (2 jam) → Default OFF

**Next Steps:**

1. Update ESP32 code dengan functions dari Section 1.2
2. Test PHP bridge dengan curl
3. Verify database sync (5-10 detik latency acceptable)
4. End-to-end test dengan hardware nyata
