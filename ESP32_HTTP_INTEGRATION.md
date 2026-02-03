# ESP32 Integration Guide - Pump Relay HTTP API

## Overview

This guide explains how to integrate your ESP32 with the new pump relay database system using HTTP requests (not MQTT).

---

## API Endpoint Details

### Base URL

```
http://<your-vercel-domain>/api/pump-relay
```

Or for local development:

```
http://localhost:3000/api/pump-relay
```

---

## 1. Update Pump Status from ESP32

### Endpoint

**POST** `/api/pump-relay`

### Request Format

```json
{
  "mode": "sawah",
  "isOn": true,
  "changedBy": "esp32",
  "userId": null
}
```

### Request Parameters

| Parameter   | Type    | Required | Description                             |
| ----------- | ------- | -------- | --------------------------------------- |
| `mode`      | string  | Yes      | Pump mode: "sawah" or "kolam"           |
| `isOn`      | boolean | Yes      | Pump state: true (ON) or false (OFF)    |
| `changedBy` | string  | No       | Source of change (default: "dashboard") |
| `userId`    | string  | No       | User ID if triggered by user action     |

### Success Response (200)

```json
{
  "success": true,
  "message": "Pompa sawah dihidupkan",
  "data": {
    "mode": "sawah",
    "isOn": true,
    "updatedAt": "2025-01-31T06:35:00Z"
  }
}
```

### Error Response (400/500)

```json
{
  "error": "Failed to update pump status"
}
```

---

## 2. Get Current Pump Status

### Endpoint

**GET** `/api/pump-relay?mode=sawah`

### Response

```json
{
  "mode": "sawah",
  "isOn": true,
  "updatedAt": "2025-01-31T06:35:00Z"
}
```

---

## 3. Query Pump History

### Endpoint

**GET** `/api/pump-history?mode=sawah&limit=20&offset=0`

### Query Parameters

| Parameter | Type   | Default | Description                 |
| --------- | ------ | ------- | --------------------------- |
| `mode`    | string | sawah   | Pump mode to query          |
| `limit`   | number | 20      | Number of records to return |
| `offset`  | number | 0       | Pagination offset           |

### Response

```json
{
  "success": true,
  "mode": "sawah",
  "data": [
    {
      "id": "clin8h1234567890abcdef",
      "mode": "sawah",
      "previousState": false,
      "newState": true,
      "changedBy": "esp32",
      "userId": null,
      "timestamp": "2025-01-31T06:35:00Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## ESP32 Arduino Code Example

### Setup WiFi and HTTP Client

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

// Server details
const char* serverUrl = "http://your-domain.vercel.app";
const char* pumpApiEndpoint = "/api/pump-relay";

// Pump control pins
const int pumpRelayPin = 32;  // GPIO 32
bool pumpIsOn = false;

void setup() {
  Serial.begin(115200);
  pinMode(pumpRelayPin, OUTPUT);
  digitalWrite(pumpRelayPin, LOW);  // Start pump OFF

  connectToWiFi();
}

void loop() {
  // Your main loop code
  // ...

  // Example: Turn pump ON after 10 seconds
  delay(10000);
  setPumpStatus(true);

  delay(5000);
  getPumpStatus();

  delay(10000);
  setPumpStatus(false);
}

void connectToWiFi() {
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFailed to connect to WiFi");
  }
}

// Function to update pump status in database
void setPumpStatus(bool state) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return;
  }

  HTTPClient http;

  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["mode"] = "sawah";
  doc["isOn"] = state;
  doc["changedBy"] = "esp32";

  String payload;
  serializeJson(doc, payload);

  // Send POST request
  String url = String(serverUrl) + String(pumpApiEndpoint);
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  int httpResponseCode = http.POST(payload);

  Serial.print("POST Response Code: ");
  Serial.println(httpResponseCode);

  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("Response: " + response);

    pumpIsOn = state;
    digitalWrite(pumpRelayPin, state ? HIGH : LOW);

  } else {
    Serial.println("Error updating pump status");
  }

  http.end();
}

// Function to get current pump status
void getPumpStatus() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return;
  }

  HTTPClient http;

  String url = String(serverUrl) + String(pumpApiEndpoint) + "?mode=sawah";
  http.begin(url);

  int httpResponseCode = http.GET();

  Serial.print("GET Response Code: ");
  Serial.println(httpResponseCode);

  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("Status Response: " + response);

    StaticJsonDocument<256> doc;
    deserializeJson(doc, response);

    bool isOn = doc["isOn"].as<bool>();
    Serial.print("Pump is: ");
    Serial.println(isOn ? "ON" : "OFF");

  } else {
    Serial.println("Error getting pump status");
  }

  http.end();
}

// Function to get pump history
void getPumpHistory() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return;
  }

  HTTPClient http;

  String url = String(serverUrl) + "/api/pump-history?mode=sawah&limit=5&offset=0";
  http.begin(url);

  int httpResponseCode = http.GET();

  Serial.print("History Response Code: ");
  Serial.println(httpResponseCode);

  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("History: " + response);

    StaticJsonDocument<1024> doc;
    deserializeJson(doc, response);

    JsonArray data = doc["data"].as<JsonArray>();
    Serial.print("Total records: ");
    Serial.println(doc["pagination"]["total"].as<int>());

    for (JsonObject entry : data) {
      Serial.print("  - ");
      Serial.print(entry["newState"].as<bool>() ? "ON" : "OFF");
      Serial.print(" (");
      Serial.print(entry["changedBy"].as<const char*>());
      Serial.println(")");
    }
  }

  http.end();
}
```

---

## Integration Checklist

### Hardware Setup

- [ ] Pump relay module connected to GPIO 32
- [ ] Relay module properly powered (5V or 3.3V according to spec)
- [ ] Pump connected to relay module
- [ ] Test relay switching manually

### Software Setup

- [ ] WiFi credentials configured
- [ ] Server URL updated to your domain
- [ ] ArduinoJson library installed (v6.x)
- [ ] HTTPClient library available in ESP32 core
- [ ] Code compiles without errors

### Testing

- [ ] ESP32 connects to WiFi successfully
- [ ] POST request to `/api/pump-relay` succeeds
- [ ] Database records created with `changedBy: "esp32"`
- [ ] GET request returns correct status
- [ ] Pump relay physically switches on/off
- [ ] Profile page shows "esp32" entries in history
- [ ] History pagination works

---

## Error Handling

### Common Issues

#### 1. WiFi Connection Fails

```cpp
// Add timeout and retry logic
if (WiFi.status() != WL_CONNECTED) {
  Serial.println("WiFi disconnected, reconnecting...");
  WiFi.reconnect();
  delay(2000);
}
```

#### 2. HTTP Request Timeout

```cpp
// Set timeout (milliseconds)
http.setTimeout(5000);
```

#### 3. JSON Parsing Fails

```cpp
if (deserializeJson(doc, response)) {
  Serial.println("JSON parse error!");
  return;
}
```

#### 4. SSL Certificate Issues (if using HTTPS)

```cpp
// For HTTPS endpoints
http.setInsecure();  // Not recommended for production
```

---

## Memory Optimization

For ESP32 with limited RAM:

```cpp
// Use StaticJsonDocument with appropriate size
// Calculate size: https://arduinojson.org/v6/assistant/

// For pump status update: ~200 bytes
StaticJsonDocument<200> smallDoc;

// For history response: ~1024 bytes (multiple records)
StaticJsonDocument<1024> largeDoc;

// Or use DynamicJsonDocument if size varies
DynamicJsonDocument doc(256);
```

---

## Security Considerations

### Current Implementation

- No authentication required on API endpoints
- Anyone with the URL can control pumps
- Suitable for private/internal networks

### Future Enhancements

1. Add API key authentication

   ```cpp
   http.addHeader("X-API-Key", "your-api-key-here");
   ```

2. Add device ID tracking

   ```cpp
   doc["deviceId"] = "esp32-001";
   ```

3. Use HTTPS for encrypted communication
   ```cpp
   const char* serverUrl = "https://your-domain.vercel.app";
   ```

---

## Testing with cURL

### Test Pump ON

```bash
curl -X POST http://localhost:3000/api/pump-relay \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "sawah",
    "isOn": true,
    "changedBy": "esp32"
  }'
```

### Test Pump OFF

```bash
curl -X POST http://localhost:3000/api/pump-relay \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "sawah",
    "isOn": false,
    "changedBy": "esp32"
  }'
```

### Get Status

```bash
curl http://localhost:3000/api/pump-relay?mode=sawah
```

### Get History

```bash
curl "http://localhost:3000/api/pump-history?mode=sawah&limit=10"
```

---

## Performance Notes

- Database queries optimized with index on (mode, timestamp)
- Typical response time: < 100ms
- Rate limiting: Not implemented (consider adding if needed)
- History queries paginated to prevent large responses

---

## Troubleshooting

### Pump doesn't turn on/off

1. Check relay GPIO pin is correct
2. Verify relay module has power
3. Test relay with simple digitalWrite test
4. Check physical pump power supply

### API returns 404

1. Verify endpoint URL is correct
2. Check mode parameter spelling ("sawah" vs "kolam")
3. Ensure Next.js API routes are deployed

### History not updating

1. Verify `changedBy` parameter is sent
2. Check database connection in Vercel logs
3. Ensure mode matches (case-sensitive)

### Slow API responses

1. Check internet connection speed
2. Monitor Vercel function duration
3. Consider caching status locally on ESP32
