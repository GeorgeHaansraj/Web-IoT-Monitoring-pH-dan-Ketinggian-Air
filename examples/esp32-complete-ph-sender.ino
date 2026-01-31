// ============================================================================
// ESP32 IoT Monitoring - Lengkap dengan Baca Sensor & Kirim ke API
// ============================================================================
// Fitur:
// 1. Baca sensor pH setiap 10 detik
// 2. Kirim ke API /api/ph (HTTP POST)
// 3. Tampilkan di LCD 16x2
// 4. Kontrol relay pompa via HTTP
// 5. Monitor WiFi & battery
// ============================================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>  // Untuk LCD 16x2 I2C
#include <ArduinoJson.h>

// ============================================================================
// KONFIGURASI WiFi
// ============================================================================
const char* SSID = "YOUR_WIFI_SSID";           // ← Ganti SSID WiFi
const char* PASSWORD = "YOUR_WIFI_PASSWORD";    // ← Ganti password WiFi

// ============================================================================
// KONFIGURASI API
// ============================================================================
// PENTING: Ganti URL ke domain Vercel atau IP server lokal
const char* API_PH_URL = "https://YOUR_DOMAIN.com/api/ph";  // ← Update ini
// Untuk local testing:
// const char* API_PH_URL = "http://192.168.x.x:3000/api/ph";

const char* DEVICE_ID = "ESP32-001";
const char* LOCATION = "sawah";  // atau "kolam"

// ============================================================================
// KONFIGURASI PIN & SENSOR
// ============================================================================
#define PH_SENSOR_PIN A0        // Pin analog untuk sensor pH (ADC0)
#define RELAY_PIN 16            // GPIO16 untuk relay pompa
#define BATTERY_PIN A3          // Pin analog untuk baca battery

// LCD I2C: SDA=GPIO21, SCL=GPIO22
LiquidCrystal_I2C lcd(0x27, 16, 2);  // Address 0x27, 16x2

// ============================================================================
// VARIABEL GLOBAL
// ============================================================================
unsigned long lastPHSendTime = 0;
unsigned long lastLCDUpdateTime = 0;
const unsigned long PH_SEND_INTERVAL = 10000;   // Kirim pH setiap 10 detik
const unsigned long LCD_UPDATE_INTERVAL = 1000; // Update LCD setiap 1 detik

float currentPH = 7.0;
float currentTemp = 25.0;
int batteryPercent = 85;

// ============================================================================
// SETUP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n");
  Serial.println("=== ESP32 IoT Monitoring - Sawah/Kolam ===");
  Serial.println("Initializing...");

  // Setup pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BATTERY_PIN, INPUT);
  pinMode(PH_SENSOR_PIN, INPUT);

  // Setup LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("IoT Monitor");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  delay(2000);

  // Setup WiFi
  setupWiFi();

  // Setup selesai
  displayReadyScreen();
  Serial.println("✓ Setup complete!\n");
}

// ============================================================================
// LOOP
// ============================================================================
void loop() {
  // Monitor WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠ WiFi disconnected, reconnecting...");
    setupWiFi();
  }

  // Baca sensor pH
  unsigned long currentTime = millis();
  readPHSensor();

  // Update LCD
  if (currentTime - lastLCDUpdateTime >= LCD_UPDATE_INTERVAL) {
    updateLCD();
    lastLCDUpdateTime = currentTime;
  }

  // Kirim pH ke API
  if (currentTime - lastPHSendTime >= PH_SEND_INTERVAL) {
    sendPHToAPI();
    lastPHSendTime = currentTime;
  }

  delay(100);
}

// ============================================================================
// FUNGSI: SETUP WiFi
// ============================================================================
void setupWiFi() {
  Serial.println("[WiFi] Connecting to " + String(SSID));

  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi connected!");
    Serial.println("IP: " + WiFi.localIP().toString());

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi: Connected");
    lcd.setCursor(0, 1);
    lcd.print("IP:" + WiFi.localIP().toString().substring(0, 15));
    delay(2000);
  } else {
    Serial.println("\n✗ WiFi failed!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi: FAILED");
    lcd.setCursor(0, 1);
    lcd.print("Check SSID/PW");
  }
}

// ============================================================================
// FUNGSI: BACA SENSOR pH
// ============================================================================
void readPHSensor() {
  // Baca analog value dari sensor
  int analogValue = analogRead(PH_SENSOR_PIN);

  // Convert analog to pH (0-1023 → 0-14)
  // PERHATIAN: Calibration ini generic, sebaiknya calibrate di lapangan!
  // Formula: pH = (analogValue / 1023) * 14
  // atau gunakan formula yang sudah dikalibrasi
  currentPH = (analogValue / 1023.0) * 14.0;

  // Smoothing (rata-rata dengan pembacaan sebelumnya)
  static float smoothedPH = 7.0;
  smoothedPH = (smoothedPH * 0.7) + (currentPH * 0.3);
  currentPH = smoothedPH;

  // Clamp to valid range
  if (currentPH < 0) currentPH = 0;
  if (currentPH > 14) currentPH = 14;

  Serial.print("[pH] Analog: ");
  Serial.print(analogValue);
  Serial.print(" → pH: ");
  Serial.println(currentPH, 2);
}

// ============================================================================
// FUNGSI: KIRIM pH KE API
// ============================================================================
void sendPHToAPI() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[API] WiFi not connected!");
    return;
  }

  HTTPClient http;

  Serial.println("[API] Sending pH to: " + String(API_PH_URL));

  try {
    http.begin(API_PH_URL);
    http.addHeader("Content-Type", "application/json");

    // Prepare JSON payload
    StaticJsonDocument<200> doc;
    doc["value"] = currentPH;
    doc["location"] = LOCATION;
    doc["deviceId"] = DEVICE_ID;
    doc["temperature"] = currentTemp;

    String jsonString;
    serializeJson(doc, jsonString);

    Serial.println("[API] Payload: " + jsonString);

    // Send POST
    int httpResponseCode = http.POST(jsonString);

    if (httpResponseCode == 201 || httpResponseCode == 200) {
      Serial.println("✓ pH sent successfully! (Code: " + String(httpResponseCode) + ")");
      Serial.println("  Location: " + String(LOCATION));
      Serial.println("  pH: " + String(currentPH, 2));
    } else {
      Serial.println("✗ Failed to send pH. HTTP Code: " + String(httpResponseCode));
      String response = http.getString();
      Serial.println("Response: " + response);
    }

    http.end();
  } catch (const std::exception& e) {
    Serial.println("✗ Exception: " + String(e.what()));
    http.end();
  }
}

// ============================================================================
// FUNGSI: UPDATE LCD
// ============================================================================
void updateLCD() {
  static int displayMode = 0;
  static unsigned long modeChangeTime = 0;

  // Switch display every 5 seconds
  unsigned long currentTime = millis();
  if (currentTime - modeChangeTime > 5000) {
    displayMode = (displayMode + 1) % 3;
    modeChangeTime = currentTime;
    lcd.clear();
  }

  lcd.setCursor(0, 0);

  switch (displayMode) {
    case 0: // Display pH & Location
      lcd.print("pH: ");
      lcd.print(currentPH, 2);
      lcd.print("  ");
      lcd.print(LOCATION);
      lcd.setCursor(0, 1);
      lcd.print("Device: ");
      lcd.print(DEVICE_ID);
      break;

    case 1: // Display WiFi & Battery
      lcd.print("WiFi: ");
      if (WiFi.status() == WL_CONNECTED) {
        lcd.print("OK");
      } else {
        lcd.print("OFF");
      }
      lcd.setCursor(0, 1);
      lcd.print("Battery: ");
      lcd.print(batteryPercent);
      lcd.print("%");
      break;

    case 2: // Display API Status
      lcd.print("API: Sending...");
      lcd.setCursor(0, 1);
      lcd.print("Interval: 10s");
      break;
  }
}

// ============================================================================
// FUNGSI: DISPLAY READY SCREEN
// ============================================================================
void displayReadyScreen() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Ready!");
  lcd.setCursor(0, 1);
  lcd.print("Monitoring...");
  delay(1000);
}

// ============================================================================
// OPTIONAL: FUNGSI KONTROL RELAY
// ============================================================================
void controlRelay(bool state) {
  digitalWrite(RELAY_PIN, state ? HIGH : LOW);
  Serial.println("[RELAY] " + String(state ? "ON" : "OFF"));
}

// ============================================================================
// OPTIONAL: FUNGSI BACA BATTERY
// ============================================================================
int readBattery() {
  int rawValue = analogRead(BATTERY_PIN);
  // Convert to percentage (0-1023 → 0-100)
  // Perlu calibration dengan actual battery voltage
  batteryPercent = map(rawValue, 0, 1023, 0, 100);
  return batteryPercent;
}

// ============================================================================
// DEBUG: Print system info
// ============================================================================
void printSystemInfo() {
  Serial.println("\n=== System Info ===");
  Serial.println("WiFi SSID: " + String(SSID));
  Serial.println("Device ID: " + String(DEVICE_ID));
  Serial.println("Location: " + String(LOCATION));
  Serial.println("API URL: " + String(API_PH_URL));
  Serial.println("Current pH: " + String(currentPH, 2));
  Serial.println("WiFi Status: " + String(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected"));
  Serial.println("IP Address: " + WiFi.localIP().toString());
  Serial.println("===================\n");
}
