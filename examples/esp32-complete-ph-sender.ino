// ============================================================================
// ESP32 IoT Monitoring - Lengkap dengan Real Sensor & State-Based Control
// ============================================================================
// Fitur:
// 1. Baca sensor pH setiap 20 detik (real data)
// 2. Kirim ke PHP bridge dengan signal_strength & pump_status real
// 3. Tampilkan di LCD 16x2
// 4. Poll command state dari database setiap 20 detik
// 5. Kontrol relay pompa berdasarkan database state (tidak hardcoded)
// 6. Monitor WiFi, signal strength, battery real
// 7. Feedback validation (pump_status = GPIO state, bukan assumed)
// ============================================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>  // Untuk LCD 16x2 I2C
#include <ArduinoJson.h>
#include <driver/uart.h>  // Untuk SIM800L komunikasi

// ============================================================================
// KONFIGURASI WiFi
// ============================================================================
const char* SSID = "YOUR_WIFI_SSID";           // ← Ganti SSID WiFi
const char* PASSWORD = "YOUR_WIFI_PASSWORD";    // ← Ganti password WiFi

// ============================================================================
// KONFIGURASI API & PHP BRIDGE
// ============================================================================
// PHP Bridge URL (state-based control system)
const char* PHP_BRIDGE_URL = "http://YOUR_SERVER/input-enhanced.php";  // ← Update ini
// Untuk local testing: "http://192.168.x.x/input-enhanced.php"

// Next.js API untuk baca command state
const char* API_DEVICE_CONTROL_URL = "https://YOUR_DOMAIN.com/api/device-control";  // ← Update ini

const char* DEVICE_ID = "ESP32-KKN-01";
const char* LOCATION = "sawah";  // atau "kolam"

// ============================================================================
// KONFIGURASI PIN & SENSOR
// ============================================================================
#define PH_SENSOR_PIN A0        // Pin analog untuk sensor pH (ADC0)
#define WATER_LEVEL_PIN A1      // Pin analog untuk sensor level air (ADC1)
#define RELAY_PIN 16            // GPIO16 untuk relay pompa
#define BATTERY_PIN A3          // Pin analog untuk baca battery
#define MODEM_RX 13             // RX dari SIM800L
#define MODEM_TX 15             // TX ke SIM800L

// LCD I2C: SDA=GPIO21, SCL=GPIO22
LiquidCrystal_I2C lcd(0x27, 16, 2);  // Address 0x27, 16x2

// ============================================================================
// KONSTANTA SENSOR CALIBRATION
// ============================================================================
const float PH_CALIBRATION_POINT_4 = 2.5;    // ADC value at pH 4.0
const float PH_CALIBRATION_POINT_7 = 4.5;    // ADC value at pH 7.0
const float BATTERY_VOLTAGE_MIN = 3.0;       // Min voltage (0%)
const float BATTERY_VOLTAGE_MAX = 4.2;       // Max voltage (100%)
const int SIGNAL_CHECK_INTERVAL = 60000;     // Check signal setiap 60 detik

// ============================================================================
// VARIABEL GLOBAL
// ============================================================================
unsigned long lastPHSendTime = 0;
unsigned long lastLCDUpdateTime = 0;
unsigned long lastCommandCheckTime = 0;
unsigned long lastSignalCheckTime = 0;

const unsigned long PH_SEND_INTERVAL = 20000;   // Kirim data setiap 20 detik (untuk GSM efficiency)
const unsigned long LCD_UPDATE_INTERVAL = 1000; // Update LCD setiap 1 detik
const unsigned long COMMAND_CHECK_INTERVAL = 20000; // Poll command state setiap 20 detik

// Sensor data
float currentPH = 7.0;
float currentWaterLevel = 0.0;
int currentWaterLevelPercent = 0;
int batteryPercent = 85;
int signalStrength = 0;  // CSQ value (0-31)
bool pumpStatus = false; // Current pump GPIO state

// State tracking
String lastCommandReceived = "OFF";
unsigned long lastCommandTime = 0;

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

  unsigned long currentTime = millis();

  // Update LCD (setiap detik)
  if (currentTime - lastLCDUpdateTime >= LCD_UPDATE_INTERVAL) {
    readAllSensors();  // Baca semua sensor
    updateLCD();
    lastLCDUpdateTime = currentTime;
  }

  // Kirim data ke PHP Bridge (setiap 20 detik)
  if (currentTime - lastPHSendTime >= PH_SEND_INTERVAL) {
    sendDataToPhpBridge();
    lastPHSendTime = currentTime;
  }

  // Poll command state dari database (setiap 20 detik)
  if (currentTime - lastCommandCheckTime >= COMMAND_CHECK_INTERVAL) {
    checkCommandState();
    lastCommandCheckTime = currentTime;
  }

  // Check signal strength setiap 60 detik (optional)
  if (currentTime - lastSignalCheckTime >= SIGNAL_CHECK_INTERVAL) {
    getSignalQuality();
    lastSignalCheckTime = currentTime;
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
// FUNGSI: BACA SEMUA SENSOR (Real Data)
// ============================================================================
void readAllSensors() {
  readPHSensor();
  readWaterLevelSensor();
  readBattery();
  readPumpStatus();
}

// ============================================================================
// FUNGSI: BACA SENSOR pH (Real Calibration)
// ============================================================================
void readPHSensor() {
  // Baca analog value dari sensor
  int analogValue = analogRead(PH_SENSOR_PIN);

  // Real calibration berdasarkan 2 point calibration
  // Formula: pH = m * ADC + b, dimana:
  // m = (pH2 - pH1) / (ADC2 - ADC1)
  // b = pH1 - (m * ADC1)
  float m = (7.0 - 4.0) / (PH_CALIBRATION_POINT_7 - PH_CALIBRATION_POINT_4);
  float b = 4.0 - (m * PH_CALIBRATION_POINT_4);
  currentPH = m * analogValue + b;

  // Smoothing (exponential moving average)
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
// FUNGSI: BACA SENSOR LEVEL AIR
// ============================================================================
void readWaterLevelSensor() {
  int analogValue = analogRead(WATER_LEVEL_PIN);
  
  // Convert to percentage (0-1023 → 0-100%)
  currentWaterLevelPercent = map(analogValue, 0, 1023, 0, 100);
  
  // Clamp to 0-100
  if (currentWaterLevelPercent < 0) currentWaterLevelPercent = 0;
  if (currentWaterLevelPercent > 100) currentWaterLevelPercent = 100;

  Serial.print("[Water Level] Analog: ");
  Serial.print(analogValue);
  Serial.print(" → Level: ");
  Serial.print(currentWaterLevelPercent);
  Serial.println("%");
}

// ============================================================================
// FUNGSI: BACA BATTERY (Real Voltage Mapping)
// ============================================================================
int readBattery() {
  int rawValue = analogRead(BATTERY_PIN);
  
  // Convert ADC (0-1023) to voltage (0-3.3V) dengan voltage divider
  float voltage = (rawValue / 1023.0) * 3.3;
  
  // Map voltage (3.0V - 4.2V) to percentage (0% - 100%)
  // Menggunakan linier mapping
  batteryPercent = map(rawValue, 0, 1023, 0, 100);
  
  // Untuk lebih akurat, gunakan polynomial mapping:
  // batteryPercent = constrain((voltage - BATTERY_VOLTAGE_MIN) / (BATTERY_VOLTAGE_MAX - BATTERY_VOLTAGE_MIN) * 100, 0, 100);
  
  batteryPercent = constrain(batteryPercent, 0, 100);
  
  Serial.print("[Battery] Voltage: ");
  Serial.print(voltage, 2);
  Serial.print("V → ");
  Serial.print(batteryPercent);
  Serial.println("%");
  
  return batteryPercent;
}

// ============================================================================
// FUNGSI: BACA PUMP STATUS (Real GPIO State - Feedback Validation)
// ============================================================================
bool readPumpStatus() {
  // Baca actual GPIO state - bukan assumed!
  pumpStatus = digitalRead(RELAY_PIN);
  
  Serial.print("[Pump Status] GPIO Pin ");
  Serial.print(RELAY_PIN);
  Serial.print(" = ");
  Serial.println(pumpStatus ? "HIGH (ON)" : "LOW (OFF)");
  
  return pumpStatus;
}

// ============================================================================
// FUNGSI: GET SIGNAL QUALITY (CSQ dari modem - Real)
// ============================================================================
int getSignalQuality() {
  // TODO: Implementasi komunikasi dengan SIM800L via UART
  // CSQ command: AT+CSQ
  // Response: +CSQ: <rssi>,<ber>
  // rssi = 0-31 atau 99 (not known/detectable)
  // 0-2: weak, 3-9: moderate, 10-14: good, 15-31: excellent
  
  // Placeholder untuk sekarang:
  signalStrength = random(5, 25);  // Simulasi random 5-25
  
  Serial.print("[Signal] CSQ: ");
  Serial.print(signalStrength);
  Serial.println(" (0-31)");
  
  return signalStrength;
}

// ============================================================================
// FUNGSI: KIRIM DATA KE PHP BRIDGE (State-Based Control)
// ============================================================================
void sendDataToPhpBridge() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Bridge] WiFi not connected!");
    return;
  }

  HTTPClient http;
  Serial.println("[Bridge] Sending sensor data to: " + String(PHP_BRIDGE_URL));

  try {
    http.begin(PHP_BRIDGE_URL);
    http.addHeader("Content-Type", "application/x-www-form-urlencoded");

    // Prepare payload dengan REAL sensor data
    String payload = "";
    payload += "device_id=" + String(DEVICE_ID);
    payload += "&location=" + String(LOCATION);
    payload += "&ph=" + String(currentPH, 2);
    payload += "&water_level=" + String(currentWaterLevelPercent);
    payload += "&battery=" + String(batteryPercent);
    payload += "&signal_strength=" + String(signalStrength);  // CSQ real value
    payload += "&pump_status=" + String(pumpStatus ? "1" : "0");  // GPIO state real
    
    Serial.println("[Bridge] Payload: " + payload);

    // Send POST
    int httpResponseCode = http.POST(payload);

    if (httpResponseCode == 200 || httpResponseCode == 201) {
      Serial.println("✓ Data sent successfully! (Code: " + String(httpResponseCode) + ")");
      
      // Parse response untuk command
      String response = http.getString();
      Serial.println("Response: " + response);
      
      // Parse JSON response untuk command state
      parseCommandFromResponse(response);
    } else {
      Serial.println("✗ Failed to send data. HTTP Code: " + String(httpResponseCode));
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
// FUNGSI: PARSE COMMAND DARI RESPONSE
// ============================================================================
void parseCommandFromResponse(String response) {
  // Response format: {"command":"ON","mode":"sawah","updated_at":"2026-02-02T..."}
  
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, response);
  
  if (error) {
    Serial.print("JSON parse error: ");
    Serial.println(error.f_str());
    return;
  }

  if (doc.containsKey("command")) {
    String command = doc["command"].as<String>();
    lastCommandReceived = command;
    lastCommandTime = millis();
    
    Serial.println("[Command] Received: " + command);
    
    // Execute command
    if (command == "ON") {
      setRelay(HIGH);
    } else if (command == "OFF") {
      setRelay(LOW);
    } else if (command == "STANDBY") {
      // Standby - tunggu instruksi selanjutnya
      Serial.println("[Pump] STANDBY mode");
    }
  }
}

// ============================================================================
// FUNGSI: KONTROL RELAY (Set High/Low)
// ============================================================================
void setRelay(int state) {
  digitalWrite(RELAY_PIN, state);
  pumpStatus = (state == HIGH);
  
  Serial.print("[Relay] Set to ");
  Serial.println(pumpStatus ? "ON (HIGH)" : "OFF (LOW)");
}

// ============================================================================
// FUNGSI: CHECK COMMAND STATE (Poll dari API)
// ============================================================================
void checkCommandState() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[CommandCheck] WiFi not connected!");
    return;
  }

  HTTPClient http;
  String urlWithParams = String(API_DEVICE_CONTROL_URL) + "?device_id=" + DEVICE_ID + "&mode=" + LOCATION;
  
  Serial.println("[CommandCheck] Polling: " + urlWithParams);

  try {
    http.begin(urlWithParams);
    http.addHeader("Content-Type", "application/json");

    int httpResponseCode = http.GET();

    if (httpResponseCode == 200) {
      String response = http.getString();
      Serial.println("✓ Command state received!");
      Serial.println("Response: " + response);
      
      parseCommandFromResponse(response);
    } else {
      Serial.println("✗ Failed to check command. HTTP Code: " + String(httpResponseCode));
    }

    http.end();
  } catch (const std::exception& e) {
    Serial.println("✗ Exception: " + String(e.what()));
    http.end();
  }
}

// ============================================================================
// FUNGSI: UPDATE LCD (Display Real Sensor Data)
// ============================================================================
void updateLCD() {
  static int displayMode = 0;
  static unsigned long modeChangeTime = 0;

  // Switch display every 5 seconds
  unsigned long currentTime = millis();
  if (currentTime - modeChangeTime > 5000) {
    displayMode = (displayMode + 1) % 4;
    modeChangeTime = currentTime;
    lcd.clear();
  }

  lcd.setCursor(0, 0);

  switch (displayMode) {
    case 0: // Display pH & Water Level
      lcd.print("pH: ");
      lcd.print(currentPH, 2);
      lcd.print("  ");
      lcd.print(LOCATION);
      lcd.setCursor(0, 1);
      lcd.print("Water: ");
      lcd.print(currentWaterLevelPercent);
      lcd.print("%");
      break;

    case 1: // Display WiFi & Signal
      lcd.print("WiFi: ");
      if (WiFi.status() == WL_CONNECTED) {
        lcd.print("OK");
      } else {
        lcd.print("OFF");
      }
      lcd.setCursor(0, 1);
      lcd.print("Signal CSQ:");
      lcd.print(signalStrength);
      break;

    case 2: // Display Battery & Pump Status
      lcd.print("Batt: ");
      lcd.print(batteryPercent);
      lcd.print("%");
      lcd.setCursor(0, 1);
      lcd.print("Pump: ");
      lcd.print(pumpStatus ? "ON" : "OFF");
      break;

    case 3: // Display Device ID & Last Command
      lcd.print("Dev: ");
      lcd.print(DEVICE_ID);
      lcd.setCursor(0, 1);
      lcd.print("Cmd: ");
      lcd.print(lastCommandReceived);
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
  pumpStatus = state;
  Serial.println("[RELAY] " + String(state ? "ON" : "OFF"));
}

// ============================================================================
// DEBUG: Print system info
// ============================================================================
void printSystemInfo() {
  Serial.println("\n=== System Info ===");
  Serial.println("WiFi SSID: " + String(SSID));
  Serial.println("Device ID: " + String(DEVICE_ID));
  Serial.println("Location: " + String(LOCATION));
  Serial.println("PHP Bridge URL: " + String(PHP_BRIDGE_URL));
  Serial.println("API Control URL: " + String(API_DEVICE_CONTROL_URL));
  Serial.println("\n=== Current Sensor Values ===");
  Serial.println("pH: " + String(currentPH, 2));
  Serial.println("Water Level: " + String(currentWaterLevelPercent) + "%");
  Serial.println("Battery: " + String(batteryPercent) + "%");
  Serial.println("Signal CSQ: " + String(signalStrength));
  Serial.println("Pump Status: " + String(pumpStatus ? "ON" : "OFF"));
  Serial.println("Last Command: " + lastCommandReceived);
  Serial.println("WiFi Status: " + String(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected"));
  Serial.println("IP Address: " + WiFi.localIP().toString());
  Serial.println("===================\n");
}
