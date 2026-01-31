// ============================================================================
// CONTOH KODE ARDUINO/ESP32: Sensor Ultrasonik untuk Pengukuran Level Air (cm)
// ============================================================================
// Sistem: Mengukur jarak permukaan air menggunakan sensor ultrasonik HC-SR04
// Output: Data dalam cm dikirim ke API web via HTTP/WiFi
// ============================================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>  // Library untuk JSON

// ============================================================================
// KONFIGURASI PIN & SENSOR
// ============================================================================

#define TRIGGER_PIN 5      // GPIO5 (Pin D1 di NodeMCU)
#define ECHO_PIN 18        // GPIO18 (Pin D8 di NodeMCU)
#define LED_PIN 2          // GPIO2 untuk indikator status

#define MAX_DISTANCE 300   // Jarak maksimal pengukuran (cm)
#define SOUND_SPEED 0.034  // Kecepatan suara: 34 cm/ms

// ============================================================================
// KONFIGURASI WIFI
// ============================================================================

const char* SSID = "YOUR_WIFI_SSID";
const char* PASSWORD = "YOUR_WIFI_PASSWORD";

// ============================================================================
// KONFIGURASI SERVER
// ============================================================================

const char* SERVER_URL = "http://192.168.1.100:3000/api/water-level";  // Ganti dengan IP server Anda
const char* DEVICE_ID = "device-001";
const char* MODE = "sawah";  // atau "kolam"
const char* LOCATION = "Lahan Utama";

// ============================================================================
// VARIABEL GLOBAL
// ============================================================================

unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 5000;  // Kirim setiap 5 detik

float previousLevel = 0;
int consecutiveSameValues = 0;

// ============================================================================
// SETUP FUNGSI
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n");
  Serial.println("================================================");
  Serial.println("Water Level Sensor - Arduino/ESP32");
  Serial.println("================================================");
  
  // Setup PIN
  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // Status LED
  digitalWrite(LED_PIN, LOW);
  
  // Setup WiFi
  setupWiFi();
  
  Serial.println("Setup selesai!\n");
}

// ============================================================================
// SETUP WIFI
// ============================================================================

void setupWiFi() {
  Serial.println("Menghubungkan ke WiFi...");
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi terhubung!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    digitalWrite(LED_PIN, HIGH);  // LED nyala = WiFi OK
  } else {
    Serial.println("\n✗ WiFi gagal terhubung!");
    digitalWrite(LED_PIN, LOW);
  }
}

// ============================================================================
// FUNGSI: BACA SENSOR ULTRASONIK
// ============================================================================

float measureWaterLevel() {
  // Bersihkan pin TRIGGER
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  
  // Kirim pulse HIGH selama 10 microsecond
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);
  
  // Baca durasi HIGH pada pin ECHO
  // pulseIn menunggu sampai pin ECHO menjadi HIGH, lalu mengukur sampai LOW
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);  // timeout 30ms
  
  if (duration == 0) {
    Serial.println("⚠ Sensor timeout - tidak ada echo");
    return -1.0;  // Return error
  }
  
  // Hitung jarak dalam cm
  // Formula: Jarak = (durasi × kecepatan suara) / 2
  // Dibagi 2 karena gelombang pergi-pulang
  float distance = duration * SOUND_SPEED / 2.0;
  
  // Validasi jarak
  if (distance > MAX_DISTANCE || distance < 2) {
    return -1.0;  // Return error jika di luar range
  }
  
  return distance;
}

// ============================================================================
// FUNGSI: STABILKAN PEMBACAAN (AVERAGING)
// ============================================================================

float getStableWaterLevel() {
  const int SAMPLES = 5;
  float measurements[SAMPLES];
  
  // Ambil 5 sample dengan delay 100ms
  for (int i = 0; i < SAMPLES; i++) {
    measurements[i] = measureWaterLevel();
    delay(100);
  }
  
  // Hitung rata-rata (simple averaging)
  float total = 0;
  int validCount = 0;
  
  for (int i = 0; i < SAMPLES; i++) {
    if (measurements[i] > 0) {
      total += measurements[i];
      validCount++;
    }
  }
  
  if (validCount == 0) {
    return -1.0;
  }
  
  float average = total / validCount;
  
  // Optional: Median filter (lebih baik untuk noise removal)
  // Bisa diimplementasi jika diperlukan
  
  return average;
}

// ============================================================================
// FUNGSI: DETEKSI PERUBAHAN SIGNIFIKAN
// ============================================================================

bool isSignificantChange(float currentLevel, float previousLevel) {
  // Hanya kirim jika perubahan > 2 cm atau perubahan 5 detik
  float difference = abs(currentLevel - previousLevel);
  
  return (difference > 2.0);  // Threshold 2 cm
}

// ============================================================================
// FUNGSI: KIRIM KE SERVER (HTTP POST)
// ============================================================================

void sendWaterLevelToServer(float waterLevel) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi tidak terhubung!");
    return;
  }
  
  HTTPClient http;
  
  // Mulai koneksi HTTP
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  
  // Buat JSON payload
  StaticJsonDocument<256> doc;
  doc["mode"] = MODE;
  doc["level"] = round(waterLevel * 10) / 10.0;  // Round ke 1 desimal
  doc["location"] = LOCATION;
  doc["deviceId"] = DEVICE_ID;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("\n📤 Mengirim ke server...");
  Serial.println("URL: " + String(SERVER_URL));
  Serial.println("Data: " + jsonString);
  
  // Kirim POST request
  int httpResponseCode = http.POST(jsonString);
  
  // Handle response
  if (httpResponseCode > 0) {
    String response = http.getString();
    
    Serial.print("✓ Response Code: ");
    Serial.println(httpResponseCode);
    Serial.println("Response: " + response);
    
    // Blink LED untuk indikasi berhasil
    blinkLED(1);
    
  } else {
    Serial.print("✗ Error Code: ");
    Serial.println(httpResponseCode);
    
    // Blink LED 2x untuk indikasi error
    blinkLED(2);
  }
  
  http.end();
}

// ============================================================================
// FUNGSI: INDIKATOR LED
// ============================================================================

void blinkLED(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, LOW);
    delay(100);
    digitalWrite(LED_PIN, HIGH);
    delay(100);
  }
  digitalWrite(LED_PIN, HIGH);
}

// ============================================================================
// LOOP UTAMA
// ============================================================================

void loop() {
  // Jangan blok dengan delay panjang
  unsigned long currentTime = millis();
  
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = currentTime;
    
    Serial.println("\n═══════════════════════════════════════");
    Serial.print("⏱ Waktu: ");
    Serial.println(currentTime / 1000);
    
    // Baca sensor dengan stabilisasi
    float waterLevel = getStableWaterLevel();
    
    if (waterLevel > 0) {
      Serial.print("📏 Level Air: ");
      Serial.print(waterLevel);
      Serial.println(" cm");
      
      // Tentukan status
      String status = "UNKNOWN";
      if (strcmp(MODE, "sawah") == 0) {
        if (waterLevel < 15) status = "CRITICAL";
        else if (waterLevel < 30) status = "LOW";
        else if (waterLevel <= 60) status = "NORMAL";
        else if (waterLevel < 75) status = "HIGH";
        else status = "VERY_HIGH";
      } else if (strcmp(MODE, "kolam") == 0) {
        if (waterLevel < 40) status = "CRITICAL";
        else if (waterLevel < 80) status = "LOW";
        else if (waterLevel <= 130) status = "NORMAL";
        else if (waterLevel < 150) status = "HIGH";
        else status = "VERY_HIGH";
      }
      
      Serial.print("📊 Status: ");
      Serial.println(status);
      
      // Kirim ke server
      sendWaterLevelToServer(waterLevel);
      previousLevel = waterLevel;
      
    } else {
      Serial.println("✗ Pembacaan sensor gagal!");
      blinkLED(3);
    }
    
    Serial.println("═══════════════════════════════════════");
  }
  
  // Jika WiFi terputus, coba reconnect
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(LED_PIN, LOW);
    Serial.println("⚠ WiFi terputus, coba reconnect...");
    setupWiFi();
  }
  
  delay(100);  // Small delay untuk responsiveness
}

// ============================================================================
// DEBUGGING FUNCTION (Optional)
// ============================================================================

void debugSensorReadings() {
  // Uncomment di setup() jika ingin debug
  // Yang berfungsi: mengukur 10x tanpa mengirim ke server
  
  Serial.println("\n--- DEBUG: 10 Pembacaan Sensor ---");
  for (int i = 0; i < 10; i++) {
    float level = measureWaterLevel();
    Serial.print("Pembacaan ");
    Serial.print(i + 1);
    Serial.print(": ");
    Serial.print(level);
    Serial.println(" cm");
    delay(500);
  }
  Serial.println("--- DEBUG Selesai ---\n");
}

// ============================================================================
// END OF CODE
// ============================================================================

/* 
CATATAN IMPLEMENTASI:

1. SENSOR ULTRASONIK HC-SR04:
   - VCC → 5V (atau 3.3V jika sudah level-shifted)
   - GND → GND
   - TRIG → GPIO5 (TRIGGER_PIN)
   - ECHO → GPIO18 (ECHO_PIN) dengan voltage divider 5V→3.3V

2. LEVEL SHIFTING (jika menggunakan 5V sensor):
   - Gunakan voltage divider untuk ECHO pin ke 3.3V
   - Resistor: 470Ω (ke 3.3V) + 1kΩ (ke GND)

3. INSTALASI LIBRARY:
   - Arduino IDE → Sketch → Include Library → Manage Libraries
   - Cari "ArduinoJson" → Install version 6.x atau 7.x

4. KONFIGURASI:
   - Ganti SSID & PASSWORD WiFi Anda
   - Ganti SERVER_URL dengan IP/hostname server Anda
   - Sesuaikan MODE ("sawah" atau "kolam")

5. TESTING:
   - Upload sketch ke board
   - Buka Serial Monitor (115200 baud)
   - Lihat log pembacaan sensor
   - Periksa apakah data masuk ke server

6. TROUBLESHOOTING:
   - LED tidak nyala: Cek WiFi connection
   - Sensor tidak baca: Cek wiring, pin config
   - Data tidak masuk server: Cek URL, firewall, WiFi

*/
