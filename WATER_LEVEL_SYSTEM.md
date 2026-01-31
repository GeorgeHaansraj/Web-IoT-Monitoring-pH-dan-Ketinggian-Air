# Water Level API Documentation

## Konsep Level Air Berbasis Sensor Ultrasonik (cm)

Sistem monitoring level air dashboard menggunakan sensor ultrasonik pada hardware untuk mengukur jarak permukaan air dari sensor, yang direpresentasikan dalam **centimeter (cm)**.

## Data Format dari Hardware

Hardware mengirimkan data level air dalam format JSON dengan satuan **cm** ke endpoint API.

### Endpoint

**POST** `/api/water-level`

### Request Body

```json
{
  "mode": "sawah",
  "level": 45,
  "location": "Lahan A",
  "deviceId": "device-001"
}
```

### Parameters

| Parameter  | Type   | Required | Description                                   |
| ---------- | ------ | -------- | --------------------------------------------- |
| `mode`     | string | Yes      | Mode lahan: `"sawah"` atau `"kolam"`          |
| `level`    | number | Yes      | Ketinggian air dalam cm (nilai positif)       |
| `location` | string | No       | Lokasi/nama lahan (default: menggunakan mode) |
| `deviceId` | string | No       | ID perangkat pengirim                         |

### Response Success (201)

```json
{
  "success": true,
  "message": "Data level air Sawah berhasil disimpan: 45cm",
  "reading": {
    "id": "uuid",
    "level": 45,
    "location": "Lahan A",
    "status": "normal",
    "timestamp": "2026-01-31T10:30:00Z"
  }
}
```

## Status Level Air

### Sawah Padi

- **Critical** (🔴): < 15 cm - Air terlalu rendah untuk padi
- **Low** (🟠): 15-30 cm - Air rendah
- **Normal/Optimal** (🟢): 30-60 cm - Kondisi ideal untuk pertumbuhan
- **High** (🔵): 60-75 cm - Air agak tinggi
- **Very High** (🔷): > 75 cm - Genangan berlebihan

### Kolam Ikan Patin

- **Critical** (🔴): < 40 cm - Air terlalu rendah untuk ikan
- **Low** (🟠): 40-80 cm - Air rendah
- **Normal/Optimal** (🟢): 80-130 cm - Kondisi ideal
- **High** (🔵): 130-150 cm - Air agak tinggi
- **Very High** (🔷): > 150 cm - Overflow risk

## Contoh Implementasi di Hardware (Arduino/ESP32)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

// Konfigurasi Ultrasonic Sensor
#define TRIGGER_PIN 5
#define ECHO_PIN 18

// MQTT Configuration
const char* mqtt_server = "YOUR_MQTT_BROKER";
WiFiClient espClient;
PubSubClient client(espClient);

void setupUltrasonic() {
  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}

float getWaterLevelCM() {
  // Trigger ultrasonic sensor
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);

  // Read echo time
  long duration = pulseIn(ECHO_PIN, HIGH);

  // Calculate distance in cm
  // Formula: Distance = (duration * speed of sound) / 2
  // Speed of sound = 343 m/s = 0.0343 cm/us
  float distance_cm = duration * 0.0343 / 2;

  return distance_cm;
}

void sendWaterLevelToAPI() {
  float waterLevel = getWaterLevelCM();

  // Format JSON
  String json = "{\"mode\":\"sawah\",\"level\":" + String(waterLevel, 1) + ",\"deviceId\":\"device-001\"}";

  // Send to API
  HTTPClient http;
  http.begin("http://YOUR_SERVER/api/water-level");
  http.addHeader("Content-Type", "application/json");
  int httpResponseCode = http.POST(json);

  if (httpResponseCode == 201) {
    Serial.println("Water level sent successfully");
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  setupUltrasonic();

  // Setup WiFi & MQTT
  connectToWiFi();
  client.setServer(mqtt_server, 1883);
}

void loop() {
  // Send water level every 5 seconds
  sendWaterLevelToAPI();
  delay(5000);
}
```

## Integrasi dengan Dashboard

Dashboard otomatis menerima data water level real-time dari:

1. **MQTT Subscription**: Hardware mengirim ke `dwipha/+/water_level`
2. **Direct API Call**: Hardware dapat mengirim POST ke `/api/water-level`

Data ditampilkan dalam format **cm** dengan:

- **Numeric Display**: Menunjukkan nilai eksak (45.5 cm)
- **Visual Meter**: Bar visualization dengan grid markings setiap 25% tinggi maksimal
- **Status Indicator**: Color-coded berdasarkan status (Critical/Low/Normal/High/Very High)
- **Mode-specific Range**: Rentang optimal berbeda untuk sawah vs kolam

## Database Storage

Setiap pembacaan water level disimpan di tabel `waterLevelReading` dengan:

- `level`: Nilai dalam cm
- `location`: Lokasi/mode lahan
- `status`: Status kondisi air
- `timestamp`: Waktu pembacaan
- `deviceId`: ID perangkat pengirim

## Alert Generation

Sistem otomatis membuat alert jika status BUKAN "normal":

- **Critical**: Kesalahan penting (air terlalu rendah)
- **Low**: Peringatan (air di bawah optimal)
- **High/Very High**: Informasi (air di atas optimal)

Alert disimpan untuk tracking dan historical analysis.
