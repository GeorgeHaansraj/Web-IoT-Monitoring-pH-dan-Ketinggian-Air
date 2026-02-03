// ============================================================================
// CONTOH KODE ESP32: Kontrol Relay Pompa via HTTP ke Dashboard API
// ============================================================================
// Sistem: Polling status pompa dari API, kontrol relay berdasarkan status
// Output: Relay ON/OFF sesuai perintah dari dashboard
// ============================================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============================================================================
// KONFIGURASI PIN & RELAY
// ============================================================================

#define RELAY_PIN 16        // GPIO16 untuk kontrol relay pompa
#define LED_STATUS_PIN 2    // GPIO2 untuk indikator status
#define BUTTON_PIN 4        // GPIO4 untuk manual override (optional)

// ============================================================================
// KONFIGURASI WIFI
// ============================================================================

const char* SSID = "YOUR_WIFI_SSID";
const char* PASSWORD = "YOUR_WIFI_PASSWORD";

// ============================================================================
// KONFIGURASI SERVER
// ============================================================================

const char* API_URL = "http://192.168.1.100:3000/api/pump-relay";  // Ganti dengan IP server
const char* DEVICE_ID = "device-001";

// ============================================================================
// VARIABEL GLOBAL
// ============================================================================

unsigned long lastPollTime = 0;
const unsigned long POLL_INTERVAL = 5000;  // Poll setiap 5 detik

bool currentPumpStatus = false;  // Status pompa terakhir
bool manualOverride = false;     // Manual override via button

// ============================================================================
// SETUP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n");
  Serial.println("================================================");
  Serial.println("Pump Relay Controller - ESP32");
  Serial.println("================================================");
  
  // Setup PIN
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_STATUS_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Initial state: pompa mati
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_STATUS_PIN, LOW);
  
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
  } else {
    Serial.println("\n✗ WiFi gagal terhubung!");
  }
}

// ============================================================================
// FUNGSI: CONTROL RELAY
// ============================================================================

void controlRelay(bool state) {
  if (state) {
    digitalWrite(RELAY_PIN, HIGH);    // Relay ON
    digitalWrite(LED_STATUS_PIN, HIGH); // LED ON
    currentPumpStatus = true;
    Serial.println("✓ Relay HIDUP - Pompa Nyala");
  } else {
    digitalWrite(RELAY_PIN, LOW);     // Relay OFF
    digitalWrite(LED_STATUS_PIN, LOW);  // LED OFF
    currentPumpStatus = false;
    Serial.println("✗ Relay MATI - Pompa Mati");
  }
}

// ============================================================================
// FUNGSI: POLLING STATUS POMPA DARI API
// ============================================================================

void pollPumpStatus() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠ WiFi tidak terhubung");
    return;
  }
  
  HTTPClient http;
  
  // Request ke API untuk dapatkan status pompa
  String url = String(API_URL) + "?mode=sawah";
  
  http.begin(url);
  int httpResponseCode = http.GET();
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    
    // Parse JSON response
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      bool pumpStatus = doc["status"] | false;
      
      Serial.print("📊 API Status: ");
      Serial.println(pumpStatus ? "ON" : "OFF");
      
      // Update relay hanya jika status berbeda
      if (pumpStatus != currentPumpStatus && !manualOverride) {
        controlRelay(pumpStatus);
      }
    } else {
      Serial.println("⚠ Error parsing JSON");
    }
  } else {
    Serial.print("✗ HTTP Error: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}

// ============================================================================
// FUNGSI: SEND PUMP COMMAND KE API
// ============================================================================

void sendPumpCommand(bool state) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠ WiFi tidak terhubung");
    return;
  }
  
  HTTPClient http;
  
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  
  // Buat JSON payload
  StaticJsonDocument<256> doc;
  doc["mode"] = "sawah";
  doc["status"] = state;
  doc["deviceId"] = DEVICE_ID;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("\n📤 Mengirim command pompa ke API...");
  Serial.println("Data: " + jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("✓ Response: " + response);
  } else {
    Serial.print("✗ HTTP Error: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}

// ============================================================================
// FUNGSI: CHECK MANUAL BUTTON
// ============================================================================

void checkManualButton() {
  static unsigned long lastButtonPressTime = 0;
  static bool lastButtonState = HIGH;
  
  bool currentButtonState = digitalRead(BUTTON_PIN);
  
  // Debounce: 200ms
  if (currentButtonState != lastButtonState) {
    if (millis() - lastButtonPressTime > 200) {
      if (currentButtonState == LOW) {  // Button pressed
        Serial.println("\n🔘 Manual button pressed!");
        
        // Toggle manual override
        manualOverride = !manualOverride;
        
        if (manualOverride) {
          // Toggle relay manual
          bool newState = !currentPumpStatus;
          controlRelay(newState);
          sendPumpCommand(newState);
          Serial.println("Manual Override: ON");
        } else {
          Serial.println("Manual Override: OFF");
        }
      }
      lastButtonPressTime = millis();
    }
  }
  
  lastButtonState = currentButtonState;
}

// ============================================================================
// LOOP UTAMA
// ============================================================================

void loop() {
  unsigned long currentTime = millis();
  
  // Check manual button setiap iterasi
  checkManualButton();
  
  // Poll API setiap POLL_INTERVAL
  if (currentTime - lastPollTime >= POLL_INTERVAL) {
    lastPollTime = currentTime;
    
    Serial.println("\n═══════════════════════════════════════");
    Serial.print("⏱ Waktu: ");
    Serial.println(currentTime / 1000);
    
    pollPumpStatus();
    
    Serial.println("═══════════════════════════════════════");
  }
  
  // Reconnect WiFi jika terputus
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(LED_STATUS_PIN, LOW);
    Serial.println("⚠ WiFi terputus, coba reconnect...");
    setupWiFi();
  }
  
  delay(100);
}

// ============================================================================
// END OF CODE
// ============================================================================

/*
CATATAN IMPLEMENTASI:

1. RELAY WIRING:
   - IN (Control) → GPIO16
   - GND → GND
   - VCC → 5V
   - Relay Output → Pompa Air

2. FLOW CONTROL:
   A. Auto Mode (Polling):
      - ESP setiap 5 detik polling ke API
      - Dashboard bisa mengubah status pompa
      - ESP akan follow status dari API
   
   B. Manual Mode (Button):
      - Tekan button untuk toggle relay langsung
      - Tidak depend pada API
      - Bisa ditekan berkali-kali

3. SAFETY FEATURES:
   - Debounce pada button (200ms)
   - LED indicator (ON = Relay ON)
   - WiFi reconnect otomatis
   - Error handling untuk HTTP requests

4. KONFIGURASI:
   - Ganti SSID & PASSWORD WiFi
   - Ganti API_URL dengan IP server Anda
   - Adjust POLL_INTERVAL sesuai kebutuhan

5. TESTING:
   - Upload sketch ke ESP32
   - Buka Serial Monitor (115200 baud)
   - Lihat log polling
   - Tekan button untuk manual override
   - Ubah status di dashboard dan lihat relay beraksi

6. TROUBLESHOOTING:
   - LED tidak nyala: Cek pin RELAY_PIN
   - API error 404: Cek URL & IP server
   - Button tidak respond: Cek wiring pin BUTTON_PIN
   - WiFi disconnect: Cek signal strength

7. NEXT IMPROVEMENTS:
   - Add EEPROM untuk save last state
   - Multiple relay per device
   - Scheduled pumping (timer)
   - Sensor feedback (flow sensor)
*/
