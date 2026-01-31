# 📡 ESP32 to API - PH Data Integration

## Quick Start: Send pH Data dari ESP32

### 1. Format HTTP Request
```
POST /api/ph HTTP/1.1
Host: your-vercel-domain.com
Content-Type: application/json

{
  "value": 7.25,
  "location": "sawah",
  "deviceId": "ESP32-001",
  "temperature": 28.5
}
```

### 2. Arduino ESP32 Code (TinyGSM)
```cpp
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Configuration
const char* WIFI_SSID = "YOUR_SSID";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";
const char* API_ENDPOINT = "https://your-domain.com/api/ph";
const char* DEVICE_ID = "ESP32-RUFI-001";

// Sensor pins
const int PH_SENSOR_PIN = 34;      // ADC pin for pH sensor
const int TEMP_SENSOR_PIN = 35;    // ADC pin for temp (optional)

// Timing
unsigned long lastPHReadTime = 0;
const unsigned long PH_READ_INTERVAL = 10000;  // 10 seconds

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\nStarting pH Sensor Integration...");
  
  connectToWiFi();
}

void loop() {
  // Read and send pH every 10 seconds
  if (millis() - lastPHReadTime >= PH_READ_INTERVAL) {
    lastPHReadTime = millis();
    
    // Read sensor values
    float phValue = readPhSensor();
    float temperature = readTemperature();
    
    Serial.printf("[PH] Value: %.2f, Temp: %.1f°C\n", phValue, temperature);
    
    // Send to API
    sendPhToAPI(phValue, temperature);
  }
}

void connectToWiFi() {
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi Connected!");
    Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n✗ WiFi Connection Failed!");
  }
}

float readPhSensor() {
  // Read analog value from pH sensor (0-4095)
  int rawValue = analogRead(PH_SENSOR_PIN);
  
  // Convert to pH (0-14 range)
  // Calibration: 0V = pH 0, 3.3V = pH 14
  // ADC: 0 = 0V, 4095 = 3.3V
  float voltage = (rawValue / 4095.0) * 3.3;
  float ph = voltage * (14.0 / 3.3);  // Linear conversion
  
  // Clamp value (0-14)
  if (ph < 0) ph = 0;
  if (ph > 14) ph = 14;
  
  return ph;
}

float readTemperature() {
  // Simple temperature from analog input
  // Replace dengan DS18B20 atau sensor lain jika available
  int rawValue = analogRead(TEMP_SENSOR_PIN);
  float voltage = (rawValue / 4095.0) * 3.3;
  float temp = (voltage - 0.5) * 100;  // Rough conversion
  
  return temp;
}

void sendPhToAPI(float phValue, float temperature) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERROR] WiFi not connected, skipping API call");
    return;
  }
  
  HTTPClient http;
  
  Serial.printf("[HTTP] POST %s\n", API_ENDPOINT);
  
  // Start HTTP request
  http.begin(API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["value"] = phValue;
  doc["location"] = "sawah";
  doc["deviceId"] = DEVICE_ID;
  doc["temperature"] = temperature;
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.printf("[JSON] %s\n", jsonPayload.c_str());
  
  // Send request
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] Response Code: %d\n", httpResponseCode);
    Serial.printf("[HTTP] Response: %s\n", response.c_str());
    
    if (httpResponseCode == 200) {
      Serial.println("[SUCCESS] pH data sent successfully!");
    } else {
      Serial.printf("[WARNING] Unexpected response code: %d\n", httpResponseCode);
    }
  } else {
    Serial.printf("[ERROR] HTTP Error: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  
  http.end();
}
```

### 3. Testing dengan cURL

**Test 1: Single pH Reading**
```bash
curl -X POST https://your-domain.com/api/ph \
  -H "Content-Type: application/json" \
  -d '{"value": 7.25, "location": "sawah", "deviceId": "ESP32-001", "temperature": 28.5}'

# Expected response:
# {"id":"cuid123...","value":7.25,"location":"sawah","timestamp":"2026-01-31T10:30:45Z",...}
```

**Test 2: Multiple Readings (Simulate 1 hour)**
```bash
#!/bin/bash
for i in {1..360}; do
  PH_VALUE=$(echo "scale=2; 7.0 + ($RANDOM % 100) / 100" | bc)
  TEMP=$(echo "scale=1; 28.0 + ($RANDOM % 50) / 10" | bc)
  
  curl -X POST https://your-domain.com/api/ph \
    -H "Content-Type: application/json" \
    -d "{\"value\": $PH_VALUE, \"location\": \"sawah\", \"deviceId\": \"ESP32-001\", \"temperature\": $TEMP}"
  
  echo "[$i/360] pH: $PH_VALUE, Temp: $TEMP°C"
  sleep 10  # Wait 10 seconds between readings
done
```

**Test 3: Verify Data Saved**
```bash
# Check raw pH readings
curl https://your-domain.com/api/ph?location=sawah&limit=10

# Check aggregated hourly data
curl "https://your-domain.com/api/ph-history?location=sawah&range=hour"

# Expected response:
# {
#   "success": true,
#   "location": "sawah",
#   "range": "hour",
#   "dataPoints": 1,
#   "data": [
#     {
#       "timestamp": "10:00",
#       "label": "10:00",
#       "ph": 7.15,
#       "min": 7.00,
#       "max": 7.30,
#       "count": 36
#     }
#   ]
# }
```

### 4. Advanced: Multi-Location Setup

**Sawah + Kolam Simultaneous**
```cpp
void sendMultipleLocations(float phValue, float temperature) {
  // Send to Sawah
  sendPhToLocation(phValue, temperature, "sawah");
  
  delay(1000);  // Small delay between requests
  
  // Send to Kolam (simulated/different sensor)
  float phValueKolam = phValue + (random(-5, 5) / 100.0);  // Slight variation
  sendPhToLocation(phValueKolam, temperature, "kolam");
}

void sendPhToLocation(float phValue, float temperature, const char* location) {
  // Same as sendPhToAPI but with different location
  HTTPClient http;
  http.begin(API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<256> doc;
  doc["value"] = phValue;
  doc["location"] = location;  // "sawah" or "kolam"
  doc["deviceId"] = DEVICE_ID;
  doc["temperature"] = temperature;
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  int httpResponseCode = http.POST(jsonPayload);
  Serial.printf("[%s] Response: %d\n", location, httpResponseCode);
  http.end();
}
```

### 5. Monitoring on Dashboard

After ESP32 sends data:

1. **Go to Dashboard** → Scroll to "Riwayat pH"
2. **Click "Jam"** → See last 24 hours aggregated by hour
3. **Click "Hari"** → See last 7 days aggregated by day
4. **Click "Bulan"** → See last 12 months aggregated by month
5. **Click "Tahun"** → See last 5 years aggregated by year

Expected visualization:
```
Riwayat pH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Jam] [Hari] [Bulan] [Tahun]

7.4 ┌────
7.3 │  ╱╲    Real data from ESP32!
7.2 │─╱  ╲── Moving average
7.1 │    ╲╱
7.0 └────
    00  04  08  12  16  20
```

### 6. Troubleshooting

| Issue | Solution |
|-------|----------|
| `Connection timeout` | Check WiFi connection, API endpoint URL |
| `401 Unauthorized` | Verify NextAuth session (API doesn't require auth currently) |
| `400 Bad Request` | Check JSON format, required fields: `value`, `location` |
| `500 Server Error` | Check Vercel logs, database connectivity |
| `Data not appearing` | Verify timestamps, check database directly |
| `High latency` | Consider batch sending, reduce update frequency |

### 7. Production Tips

✅ **Rate Limiting**: Don't send more than 1 request/second  
✅ **Error Retry**: Implement exponential backoff on failures  
✅ **Data Validation**: Ensure pH 0-14, temperature realistic  
✅ **Logging**: Keep serial logs for debugging  
✅ **Battery**: Consider power-saving modes if on battery  
✅ **Certificate**: Use HTTPS for production  

---

## 📊 Expected Database State After 1 Hour

```sql
-- Run this query to verify data
SELECT 
  DATE_PART('hour', timestamp) as hour,
  COUNT(*) as reading_count,
  ROUND(AVG(value)::numeric, 2) as avg_ph,
  ROUND(MIN(value)::numeric, 2) as min_ph,
  ROUND(MAX(value)::numeric, 2) as max_ph
FROM ph_readings 
WHERE location = 'sawah' AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY DATE_PART('hour', timestamp)
ORDER BY hour DESC;
```

**Expected output after 1 hour (360 readings at 10-second interval):**
```
hour | reading_count | avg_ph | min_ph | max_ph
-----|---------------|--------|--------|-------
 10  |     360       |  7.15  |  7.00  | 7.30
```

---

## 🎯 Validation Checklist

After sending pH data from ESP32:

- [ ] API receives POST requests (check Vercel logs)
- [ ] Data appears in database (SELECT COUNT(*) FROM ph_readings)
- [ ] Dashboard loads "Riwayat pH" section
- [ ] Chart shows data points for selected range
- [ ] Range selector buttons work (Jam/Hari/Bulan/Tahun)
- [ ] Tooltip shows pH values on hover
- [ ] No console errors in browser

---

**Status**: Ready for ESP32 integration! 🚀

