/*
 * ESP32 HTTP Relay Control Server
 * Untuk menerima command dari Bridge PHP dan kontrol relay fisik
 * 
 * Setup:
 * 1. Update WiFi credentials
 * 2. Update PIN_RELAY2 sesuai hardware
 * 3. Upload ke ESP32
 * 4. Test: curl http://ESP32_IP:8080/relay?mode=sawah&state=1
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// --- KONFIGURASI WiFi ---
const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

// --- PIN CONFIGURATION ---
#define PIN_RELAY2 18  // GPIO 18 - Relay Pompa (sesuaikan dengan setup Anda)
#define PIN_STATUS_LED 2  // Optional: LED untuk indikator

// --- HTTP SERVER ---
WebServer server(8080);

// --- STATUS TRACKING ---
bool pump_on = false;
String current_mode = "sawah";
unsigned long last_command_time = 0;

// --- SETUP ---
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n=== ESP32 HTTP Relay Server ===");
  Serial.println("Starting...");
  
  // Setup GPIO pins
  pinMode(PIN_RELAY2, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);
  
  // Initial state: Relay OFF
  digitalWrite(PIN_RELAY2, HIGH);  // HIGH = OFF (depending on relay type)
  digitalWrite(PIN_STATUS_LED, LOW);
  
  // Connect to WiFi
  connectToWiFi();
  
  // Setup HTTP endpoints
  setupServer();
  
  Serial.println("Ready to receive commands!");
}

// --- LOOP ---
void loop() {
  server.handleClient();
}

// --- WiFi CONNECTION ---
void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFailed to connect WiFi");
  }
}

// --- HTTP SERVER SETUP ---
void setupServer() {
  // Endpoint: POST /relay - Control relay
  server.on("/relay", HTTP_POST, handleRelayControl);
  server.on("/relay", HTTP_GET, handleRelayStatus);  // GET for status
  
  // Endpoint: GET /status - Get current status
  server.on("/status", HTTP_GET, handleGetStatus);
  
  // Endpoint: GET /health - Health check
  server.on("/health", HTTP_GET, handleHealthCheck);
  
  // Default endpoint
  server.onNotFound(handleNotFound);
  
  server.begin();
  Serial.println("HTTP Server started on port 8080");
}

// --- HANDLER: Control Relay ---
void handleRelayControl() {
  Serial.println("\n[HTTP] POST /relay received");
  
  // Get parameters
  String mode = server.arg("mode");    // "sawah", "kolam", etc
  String state_str = server.arg("state");  // "0" atau "1"
  
  Serial.print("[HTTP] Mode: "); Serial.println(mode);
  Serial.print("[HTTP] State: "); Serial.println(state_str);
  
  // Validate
  if (mode.isEmpty() || state_str.isEmpty()) {
    server.send(400, "application/json", "{\"error\":\"Missing parameters\"}");
    return;
  }
  
  // Parse state
  bool new_state = (state_str == "1" || state_str == "true");
  current_mode = mode;
  
  // Control relay
  controlRelay(new_state);
  pump_on = new_state;
  last_command_time = millis();
  
  // Update LED
  digitalWrite(PIN_STATUS_LED, new_state ? HIGH : LOW);
  
  // Response
  DynamicJsonDocument doc(256);
  doc["success"] = true;
  doc["command"] = new_state ? "POMPA_ON" : "POMPA_OFF";
  doc["mode"] = mode;
  doc["pump_on"] = pump_on;
  doc["timestamp"] = String(millis() / 1000);
  
  String response;
  serializeJson(doc, response);
  
  server.send(200, "application/json", response);
  
  Serial.println("[HTTP] Response sent");
}

// --- HANDLER: Get Status ---
void handleGetStatus() {
  Serial.println("[HTTP] GET /status");
  
  DynamicJsonDocument doc(256);
  doc["mode"] = current_mode;
  doc["pump_on"] = pump_on;
  doc["relay_pin_state"] = digitalRead(PIN_RELAY2);
  doc["uptime_seconds"] = String(millis() / 1000);
  doc["timestamp"] = String(millis());
  
  String response;
  serializeJson(doc, response);
  
  server.send(200, "application/json", response);
}

// --- HANDLER: Health Check ---
void handleHealthCheck() {
  Serial.println("[HTTP] GET /health");
  
  DynamicJsonDocument doc(256);
  doc["status"] = "ok";
  doc["device"] = "ESP32-Relay-Server";
  doc["version"] = "1.0";
  doc["wifi_signal"] = WiFi.RSSI();
  doc["relay_status"] = pump_on ? "ON" : "OFF";
  
  String response;
  serializeJson(doc, response);
  
  server.send(200, "application/json", response);
}

// --- HANDLER: Relay Status (GET) ---
void handleRelayStatus() {
  if (server.method() == HTTP_GET) {
    handleGetStatus();
  }
}

// --- HANDLER: Not Found ---
void handleNotFound() {
  String message = "Endpoint not found\n\n";
  message += "Available endpoints:\n";
  message += "POST /relay?mode=sawah&state=1\n";
  message += "GET /status\n";
  message += "GET /health\n";
  
  server.send(404, "text/plain", message);
}

// --- RELAY CONTROL LOGIC ---
void controlRelay(bool turn_on) {
  Serial.print("[RELAY] Controlling relay: ");
  Serial.println(turn_on ? "ON" : "OFF");
  
  if (turn_on) {
    // Turn ON
    digitalWrite(PIN_RELAY2, LOW);  // LOW = ON (sesuaikan dengan modul relay Anda)
    Serial.println("[RELAY] ✓ Pompa DIHIDUPKAN");
  } else {
    // Turn OFF
    digitalWrite(PIN_RELAY2, HIGH); // HIGH = OFF
    Serial.println("[RELAY] ✓ Pompa DIMATIKAN");
  }
}

// --- OPTIONAL: Add this to your main monitoring sketch ---
/*
 * Atau tambahkan di dalam loop() untuk polling API Vercel:
 * 
void pollVercelAPI() {
  static unsigned long lastPoll = 0;
  if (millis() - lastPoll < 10000) return;  // Poll setiap 10 detik
  lastPoll = millis();
  
  if (!WiFi.isConnected()) return;
  
  HTTPClient http;
  String url = "http://your-vercel-domain/api/pump-relay?mode=sawah";
  
  http.begin(url);
  int code = http.GET();
  
  if (code == 200) {
    String response = http.getString();
    // Parse dan check "isOn" value
    // Jika berubah, control relay
  }
  
  http.end();
}
 */
