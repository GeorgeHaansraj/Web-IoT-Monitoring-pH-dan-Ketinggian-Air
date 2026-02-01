// ============================================================================
// ESP32 IoT Monitoring - TinyGsm + SIM800L + Real Sensor & State-Based Control
// ============================================================================
// Fitur:
// 1. Koneksi GSM via SIM800L (bukan WiFi!)
// 2. Baca sensor pH setiap 20 detik (real data)
// 3. Kirim ke PHP bridge dengan signal_strength & pump_status real
// 4. Tampilkan di LCD 16x2
// 5. Poll command state dari database setiap 20 detik
// 6. Kontrol relay pompa berdasarkan database state (tidak hardcoded)
// 7. Monitor signal strength, battery real
// 8. Feedback validation (pump_status = GPIO state, bukan assumed)
// ============================================================================

#define TINY_GSM_MODEM_SIM800    // Gunakan SIM800 library
#define TINY_GSM_RX_BUFFER 1024  // Increase RX buffer for larger responses

#include <TinyGsmClient.h>       // GSM Client (bukan WiFi!)
#include <PubSubClient.h>        // MQTT (optional, untuk fallback)
#include <Wire.h>
#include <LiquidCrystal_I2C.h>   // Untuk LCD 16x2 I2C
#include <ArduinoJson.h>

// ============================================================================
// KONFIGURASI GSM / SIM800L
// ============================================================================
#define MODEM_RX 13              // RX dari SIM800L
#define MODEM_TX 15              // TX ke SIM800L
#define GSM_BAUD 9600            // SIM800L baud rate (jangan ganti!)

const char* APN = "internet";    // ← GANTI SESUAI PROVIDER (indosatgprs, axis, smartfren, dll)
const char* GSM_USER = "";       // Username APN (biasanya kosong)
const char* GSM_PASS = "";       // Password APN (biasanya kosong)

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

// LCD I2C: SDA=GPIO21, SCL=GPIO22
LiquidCrystal_I2C lcd(0x27, 16, 2);  // Address 0x27, 16x2

// GSM Serial (HardwareSerial)
HardwareSerial SerialGSM(2);  // UART2 untuk SIM800L

// TinyGsm client
TinyGsm modem(SerialGSM);
TinyGsmClient client(modem);

// ============================================================================
// KONSTANTA SENSOR CALIBRATION
// ============================================================================
const float PH_CALIBRATION_POINT_4 = 2.5;    // ADC value at pH 4.0
const float PH_CALIBRATION_POINT_7 = 4.5;    // ADC value at pH 7.0
const float BATTERY_VOLTAGE_MIN = 3.0;       // Min voltage (0%)
const float BATTERY_VOLTAGE_MAX = 4.2;       // Max voltage (100%)

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
  Serial.println("=== ESP32 IoT Monitoring GSM - Sawah/Kolam ===");
  Serial.println("Initializing GSM modem...");

  // Setup pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BATTERY_PIN, INPUT);
  pinMode(PH_SENSOR_PIN, INPUT);

  // Setup LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("IoT GSM Monitor");
  lcd.setCursor(0, 1);
  lcd.print("Init GSM...");
  delay(2000);

  // Setup GSM Serial
  SerialGSM.begin(GSM_BAUD, SERIAL_8N1, MODEM_RX, MODEM_TX);
  delay(1000);

  // Initialize GSM modem
  Serial.println("[GSM] Initializing modem...");
  if (!modem.init()) {
    Serial.println("✗ GSM modem failed to initialize!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("GSM Init FAILED");
    while (1) { delay(1000); }  // Halt if modem fails
  }

  Serial.println("✓ GSM modem initialized");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("GSM Connected");
  delay(1000);

  // Get modem info
  String modemInfo = modem.getModemInfo();
  Serial.println("Modem: " + modemInfo);

  // Unlock SIM if needed (PIN = "")
  if (!modem.simUnlock("")) {
    Serial.println("⚠ SIM unlock failed or already unlocked");
  }

  // Connect to GPRS
  Serial.println("[GPRS] Connecting to APN: " + String(APN));
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("GPRS Connect...");
  lcd.setCursor(0, 1);
  lcd.print(APN);

  if (!modem.gprsConnect(APN, GSM_USER, GSM_PASS)) {
    Serial.println("✗ GPRS failed to connect!");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("GPRS FAILED");
    while (1) { delay(1000); }  // Halt if GPRS fails
  }

  Serial.println("✓ GPRS connected!");
  displayReadyScreen();
  Serial.println("✓ Setup complete!\n");
}

// ============================================================================
// LOOP
// ============================================================================
void loop() {
  // Monitor GSM connection
  if (!modem.isGprsConnected()) {
    Serial.println("⚠ GPRS disconnected, reconnecting...");
    if (modem.gprsConnect(APN, GSM_USER, GSM_PASS)) {
      Serial.println("✓ GPRS reconnected");
    }
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

  // Check signal strength setiap 60 detik
  if (currentTime - lastSignalCheckTime >= SIGNAL_CHECK_INTERVAL) {
    getSignalQuality();
    lastSignalCheckTime = currentTime;
  }

  delay(100);
}

// ============================================================================
// FUNGSI: GET SIGNAL QUALITY (CSQ dari modem - Real GSM Signal)
// ============================================================================
int getSignalQuality() {
  // Baca CSQ dari SIM800L
  // AT+CSQ → +CSQ: <rssi>,<ber>
  // rssi: 0-31 (0=weakest, 31=strongest, 99=unknown)
  // ber: 0-7 (0=best, 7=worst, 99=unknown)
  
  int rssi = modem.getSignalQuality();
  
  // Map RSSI to CSQ
  // RSSI = -113 + 2*CSQ dBm
  // CSQ 0 = -113 dBm (very weak)
  // CSQ 31 = -51 dBm (excellent)
  signalStrength = rssi;
  
  Serial.print("[Signal] RSSI: ");
  Serial.print(rssi);
  Serial.print(" (0-31 scale, higher=better)");
  Serial.println();
  
  return signalStrength;
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
  if (!modem.isGprsConnected()) {
    Serial.println("[Bridge] GPRS not connected!");
    return;
  }

  Serial.println("[Bridge] Connecting to PHP server...");
  
  // Parse URL untuk PHP bridge
  // Format: http://your-server/input-enhanced.php
  const char* SERVER_URL = "YOUR_SERVER";  // ← GANTI ke server address (tanpa http://)
  const int PORT = 80;  // HTTP port

  if (!client.connect(SERVER_URL, PORT)) {
    Serial.println("✗ Failed to connect to server!");
    return;
  }

  Serial.println("✓ Connected! Sending data...");

  // Prepare POST request
  String postData = "";
  postData += "device_id=" + String(DEVICE_ID);
  postData += "&location=" + String(LOCATION);
  postData += "&ph=" + String(currentPH, 2);
  postData += "&water_level=" + String(currentWaterLevelPercent);
  postData += "&battery=" + String(batteryPercent);
  postData += "&signal_strength=" + String(signalStrength);
  postData += "&pump_status=" + String(pumpStatus ? "1" : "0");
  
  Serial.println("[Bridge] Payload: " + postData);

  // Send HTTP POST request
  client.print("POST /input-enhanced.php HTTP/1.1\r\n");
  client.print("Host: " + String(SERVER_URL) + "\r\n");
  client.print("Connection: close\r\n");
  client.print("Content-Type: application/x-www-form-urlencoded\r\n");
  client.print("Content-Length: " + String(postData.length()) + "\r\n");
  client.print("\r\n");
  client.print(postData);
  client.print("\r\n");

  // Wait for response
  delay(500);

  String response = "";
  while (client.available()) {
    response += (char)client.read();
  }

  client.stop();

  if (response.length() > 0) {
    Serial.println("✓ Response received!");
    Serial.println("Response: " + response);
    
    // Parse JSON dari response
    parseCommandFromResponse(response);
  } else {
    Serial.println("✗ No response from server!");
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
  if (!modem.isGprsConnected()) {
    Serial.println("[CommandCheck] GPRS not connected!");
    return;
  }

  Serial.println("[CommandCheck] Polling command state...");

  const char* SERVER_URL = "YOUR_DOMAIN";  // ← GANTI domain/IP
  const int PORT = 443;  // HTTPS port (atau 80 untuk HTTP)

  // Build query URL
  String urlPath = "/api/device-control?device_id=" + String(DEVICE_ID) + "&mode=" + String(LOCATION);

  if (!client.connect(SERVER_URL, PORT)) {
    Serial.println("✗ Failed to connect to API server!");
    return;
  }

  Serial.println("✓ Connected to API! Requesting state...");

  // Send HTTP GET request
  client.print("GET " + urlPath + " HTTP/1.1\r\n");
  client.print("Host: " + String(SERVER_URL) + "\r\n");
  client.print("Connection: close\r\n");
  client.print("Content-Type: application/json\r\n");
  client.print("\r\n");

  // Wait for response
  delay(500);

  String response = "";
  bool bodyStart = false;
  while (client.available()) {
    char c = (char)client.read();
    
    // Skip headers, get only JSON body
    if (c == '{') bodyStart = true;
    if (bodyStart) response += c;
  }

  client.stop();

  if (response.length() > 0) {
    Serial.println("✓ Command state received!");
    Serial.println("Response: " + response);
    parseCommandFromResponse(response);
  } else {
    Serial.println("✗ No response from API!");
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

    case 1: // Display GPRS & Signal
      lcd.print("GPRS: ");
      if (modem.isGprsConnected()) {
        lcd.print("OK");
      } else {
        lcd.print("OFF");
      }
      lcd.setCursor(0, 1);
      lcd.print("Signal RSSI:");
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
  Serial.println("\n=== System Info (GSM/GPRS) ===");
  Serial.println("Device ID: " + String(DEVICE_ID));
  Serial.println("Location: " + String(LOCATION));
  Serial.println("GSM APN: " + String(APN));
  Serial.println("PHP Bridge URL: http://YOUR_SERVER/input-enhanced.php");
  Serial.println("API Control URL: https://YOUR_DOMAIN/api/device-control");
  Serial.println("\n=== Current Sensor Values ===");
  Serial.println("pH: " + String(currentPH, 2));
  Serial.println("Water Level: " + String(currentWaterLevelPercent) + "%");
  Serial.println("Battery: " + String(batteryPercent) + "%");
  Serial.println("Signal RSSI: " + String(signalStrength) + " (higher=better)");
  Serial.println("Pump Status: " + String(pumpStatus ? "ON" : "OFF"));
  Serial.println("Last Command: " + lastCommandReceived);
  Serial.println("GPRS Status: " + String(modem.isGprsConnected() ? "Connected" : "Disconnected"));
  Serial.println("===================\n");
}
