#define TINY_GSM_MODEM_SIM800
#include <TinyGsmClient.h>
#include <ArduinoHttpClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <LiquidCrystal_I2C.h>
#include <NewPing.h>
#include <Wire.h>
#include <Preferences.h>

// --- 1. KONFIGURASI KONEKSI & API ---
const char apn[]      = "internet";
const char* server    = "20.2.138.40"; // IP Server
const char* resource  = "/input.php"; // [PERBAIKAN 1] Resource didefinisikan
const char* devId     = "ESP32-KKN-01-tematikgo";

// --- 2. DEFINISI PIN ---
#define RX_GSM 26
#define TX_GSM 27
#define PIN_RELAY 4
// [PERBAIKAN 2] Definisi Relay Tambahan (Mapping ke Pin 4 jika hanya 1 relay)
#define PIN_RELAY1 4
#define PIN_RELAY2 4

#define PIN_LED_R  15
#define PIN_LED_G  14
#define PIN_LED_B  2
#define PIN_BUZZER 13
#define PIN_TRIG 5
#define PIN_ECHO 19
#define PIN_PH    36
#define PIN_BATT  34
#define BTN_SAWAH 32
#define BTN_SUMUR 33
#define BTN_KOLAM 25
#define BTN_OK    23
#define BTN_CAL_PIN 17

// --- 3. OBJEK & VARIABEL GLOBAL ---
HardwareSerial SerialGSM(2);
TinyGsm modem(SerialGSM);
TinyGsmClient gsm_client(modem);
HttpClient    http(gsm_client, server, 80);
Preferences preferences;
LiquidCrystal_I2C lcd(0x27, 16, 2);
NewPing sonar(PIN_TRIG, PIN_ECHO, 200);

enum SystemMode { MODE_MANUAL, MODE_IOT_INIT, MODE_IOT_RUN };
enum ManualState { SAWAH, SUMUR, KOLAM };

SystemMode currentSysMode = MODE_MANUAL;
ManualState currentManualState = SAWAH;
volatile bool interruptTriggered = false;
volatile int pendingModeSelect = -1;

float phValue = 0.0;
float waterLevel = 0.0; // Variabel global water level
float calibrationOffset = 0.0;
unsigned long iotStartTime = 0;
unsigned long lastSendTime = 0;
// Interval pengiriman (ms)
const long sendInterval = 20000;

int relay2State = HIGH;
String currentLocLabel = "sawah";

float limitBawah = 6.0;
float limitAtas = 8.0;
unsigned long buzzerStartTime = 0;
bool isAbnormalState = false;

int signalStrength = 0;
bool pumpStatus = false;

// Deklarasi fungsi di awal agar tidak error scope
float readRawPH();
float readBatteryVoltage();
int getBatteryPercentage(float voltage);
float readWaterLevel();
void checkAlarm(float ph); // Ganti nama controlAlerts jadi checkAlarm biar konsisten? Atau pakai controlAlerts
void displayLCD(); // Wrapper function
void controlAlerts(float ph);
// --- VARIABEL TAMBAHAN UNTUK FIX SINKRONISASI ---
String lastSyncMode = "HARDWARE_PRIORITY"; // Default awal

// Fungsi sort array
void sortArray(int *a, int n) {
  for (int i = 1; i < n; ++i) {
    int j = a[i];
    int k;
    for (k = i - 1; (k >= 0) && (j < a[k]); k--) {
      a[k + 1] = a[k];
    }
    a[k + 1] = j;
  }
}

// --- 4. FUNGSI BACA SENSOR ---
float readRawPH() {
  const int numSamples = 30;
  int samples[numSamples];
  for (int i = 0; i < numSamples; i++) {
    samples[i] = analogRead(PIN_PH);
    delay(5);
  }
  sortArray(samples, numSamples);
  long middleTotal = 0;
  for (int i = 12; i < 18; i++) {
    middleTotal += samples[i];
  }
  float averageRaw = middleTotal / 6.0;
  float voltage = (averageRaw / 4095.0) * 3.3;
  float phCalculated = (-4.91 * voltage) + 18.36;
  if (phCalculated < 0) phCalculated = 0.0;
  if (phCalculated > 14) phCalculated = 14.0;
  return phCalculated;
}

float readBatteryVoltage() {
  float totalVoltage = 0;
  int sampleCount = 0;
  static float lastValidVoltage = 3.7;
  for (int i = 0; i < 20; i++) {
    int raw = analogRead(PIN_BATT);
    float instantVoltage = (raw / 4095.0) * 3.3;
    instantVoltage = instantVoltage * 2.18; // Kalibrasi
    if (instantVoltage > 1.0) {
      totalVoltage += instantVoltage;
      sampleCount++;
    }
    delay(3);
  }
  if (sampleCount == 0) return lastValidVoltage;
  float finalVoltage = totalVoltage / sampleCount;
  lastValidVoltage = finalVoltage;
  return finalVoltage;
}

int getBatteryPercentage(float voltage) {
  int percentage = 0;
  if (voltage >= 4.15) percentage = 100;
  else if (voltage >= 3.75) percentage = (int)((voltage - 3.75) * (100 - 50) / (4.15 - 3.75) + 50);
  else if (voltage >= 3.40) percentage = (int)((voltage - 3.40) * (50 - 0) / (3.75 - 3.40) + 0);
  else percentage = 0;
  return percentage;
}

float readWaterLevel() {
  const int samples = 10;
  long totalDistance = 0;
  int validSamples = 0;
  for (int i = 0; i < samples; i++) {
    unsigned int distance = sonar.ping_cm();
    if (distance > 0 && distance < 400) {
      totalDistance += distance;
      validSamples++;
    }
    delay(20);
  }
  if (validSamples == 0) return 0.0;
  return (float)totalDistance / validSamples;
}

// --- 5. LOGIKA TOMBOL & MODE ---
void toggleRelay2() {
  relay2State = !relay2State;
  digitalWrite(PIN_RELAY2, relay2State);
  lcd.clear(); lcd.print("POMPA AIR"); lcd.setCursor(0, 1); lcd.print(relay2State == LOW ? "ON" : "OFF"); delay(1000);
}

void executeStateChange(int modeID) {
  digitalWrite(PIN_BUZZER, HIGH); delay(100); digitalWrite(PIN_BUZZER, LOW);
  if (modeID == 4) { // Kalibrasi
    lcd.clear(); lcd.print("Kalibrasi...");
    float totalVoltage = 0;
    for (int i = 0; i < 10; i++) {
      totalVoltage += (analogRead(PIN_PH) * (3.3 / 4095.0)); delay(20);
    }
    calibrationOffset = 6.86 - (3.5 * (totalVoltage / 10.0));
    saveCalibration();
    lcd.clear(); lcd.print("Kalibrasi OK!"); delay(2000);
  } else if (modeID == 3) { // Mode IoT
    currentSysMode = MODE_IOT_INIT;
    iotStartTime = millis();
    lcd.clear(); lcd.print("Connecting IoT..");
    digitalWrite(PIN_RELAY1, HIGH); // Gunakan mapping PIN_RELAY1
    Serial.println("[SYSTEM] Mode IoT Aktif.");
  } else { // Mode Manual
    currentSysMode = MODE_MANUAL;
    if (modeID == 0) {
      currentManualState = SAWAH;
      currentLocLabel = "sawah";
    }
    else if (modeID == 1) {
      currentManualState = SUMUR;
      currentLocLabel = "sumur";
    }
    else if (modeID == 2) {
      currentManualState = KOLAM;
      currentLocLabel = "kolam";
    }
  }
}

void handleButtonPress() {
  interruptTriggered = false;
  int selectedModeID = pendingModeSelect;
  pendingModeSelect = -1;
  int pinTarget = -1;
  String namaMode = "";
  switch (selectedModeID) {
    case 0: pinTarget = BTN_SAWAH; namaMode = "Mode SAWAH"; break;
    case 1: pinTarget = BTN_SUMUR; namaMode = "Mode SUMUR"; break;
    case 2: pinTarget = BTN_KOLAM; namaMode = "Mode KOLAM"; break;
    case 4: pinTarget = BTN_CAL_PIN; namaMode = "Kalibrasi"; break;
    default:  return;
  }
  lcd.clear(); lcd.print("TAHAN TOMBOL...");
  unsigned long startHold = millis();
  bool actionReady = false;
  while (digitalRead(pinTarget) == LOW) {
    unsigned long duration = millis() - startHold;
    if (duration > 3000 && duration < 5000 && !actionReady) {
      actionReady = true;
      digitalWrite(PIN_BUZZER, HIGH); delay(100); digitalWrite(PIN_BUZZER, LOW);
      lcd.clear(); lcd.print("LEPAS -> OK");
    }
    if (duration > 5000) {
      if (selectedModeID == 4) {
        toggleRelay2();
        return;
      }
      if (selectedModeID == 0) {
        executeStateChange(3);
        return;
      }
    }
    delay(10);
  }
  if (actionReady) executeStateChange(selectedModeID);
}

void updateLimits() {
  if (currentManualState == KOLAM) {
    // Standar Kolam: 6.5 - 8.5 Aman (Mantap)
    limitBawah = 6.5;
    limitAtas = 8.5;
  }
  else if (currentManualState == SAWAH) {
    // Standar Sawah: 5.5 - 7.0 Aman (Subur)
    limitBawah = 5.5;
    limitAtas = 7.0;
  }
  else if (currentManualState == SUMUR) {
    // Standar Sumur: 6.5 - 7.5 Aman (Jernih/Normal)
    // (Kita anggap 6.0-6.4 masih toleransi normal bawah agar tidak berisik)
    limitBawah = 6.0;
    limitAtas = 7.5;
  }
}

void controlAlerts(float ph) {
  digitalWrite(PIN_LED_R, LOW); digitalWrite(PIN_LED_G, LOW); digitalWrite(PIN_LED_B, LOW);
  bool bad = false;
  if (ph < limitBawah) {
    digitalWrite(PIN_LED_R, HIGH);
    bad = true;
  }
  else if (ph > limitAtas) {
    digitalWrite(PIN_LED_B, HIGH);
    bad = true;
  }
  else {
    digitalWrite(PIN_LED_G, HIGH);
  }

  if (bad) {
    if (!isAbnormalState) {
      isAbnormalState = true;
      digitalWrite(PIN_BUZZER, HIGH);
      buzzerStartTime = millis();
    }
    else if (millis() - buzzerStartTime > 5000) digitalWrite(PIN_BUZZER, LOW);
  } else {
    isAbnormalState = false;
    digitalWrite(PIN_BUZZER, LOW);
  }
}

// Wrapper agar tidak error di loop
void checkAlarm(float ph) {
  controlAlerts(ph);
}

// --- 7. RUN MANUAL MODE (FINAL: STATUS pH BARU) ---
// --- 7. RUN MANUAL MODE (FINAL: 3 MODE SPESIFIK) ---
void runManualMode() {
  // 1. Update limit dan baca data
  updateLimits();
  phValue = readRawPH() + calibrationOffset;
  int batLevel = getBatteryPercentage(readBatteryVoltage());

  // ==========================================
  // A. LOGIKA TAMPILAN HEADER (BATTERY KANAN)
  // ==========================================
  String header = "M:";
  if (currentManualState == SAWAH) header += "SAWAH";
  else if (currentManualState == SUMUR) header += "SUMUR";
  else if (currentManualState == KOLAM) header += "KOLAM";

  // Format Baterai: "99%" di pojok kanan
  String batText = String(batLevel) + "%";
  int spaces = 16 - header.length() - batText.length();
  if (spaces < 0) spaces = 0;

  for (int i = 0; i < spaces; i++) header += " ";
  header += batText;

  lcd.setCursor(0, 0);
  lcd.print(header);

  // ==========================================
  // B. LOGIKA TAMPILAN pH & SARAN (PER MODE)
  // ==========================================
  lcd.setCursor(0, 1);
  lcd.print("pH:");
  lcd.print(phValue, 1);
  lcd.print(" "); // Spasi pemisah

  // --- CABANG LOGIKA UTAMA (Sesuai Request) ---

  if (currentManualState == KOLAM) {
    // Pin 25: KOLAM IKAN
    if (phValue < 4.0)       lcd.print("Ganti Air"); // Bahaya -> Ganti Air
    else if (phValue <= 5.5) lcd.print("+Dolomit "); // Asam -> Tabur Dolomit
    else if (phValue <= 6.4) lcd.print("Kapur Sdk"); // Krg Nafsu -> Kapur Sedikit
    else if (phValue <= 8.5) lcd.print("Mantap   "); // Bagus
    else                     lcd.print("+Air Baru"); // Keras -> Tambah Air Baru
  }
  else if (currentManualState == SAWAH) {
    // Pin 32: SAWAH PADI
    if (phValue < 4.5)       lcd.print("Kapur Tgg"); // Rusak -> Kapur Dosis Tinggi
    else if (phValue <= 5.4) lcd.print("+Dolomit "); // Sulit Tumbuh
    else if (phValue <= 7.0) lcd.print("Tnh Subur"); // Subur -> Lanjut Pupuk
    else                     lcd.print("+Pupuk ZA"); // Basa -> Pakai ZA
  }
  else {
    // Pin 33: SUMUR (AIR BERSIH)
    if (phValue < 6.0)       lcd.print("Endapkan "); // Masam -> Endapkan/Aerasi
    else if (phValue <= 7.5) lcd.print("Siap Pkai"); // Normal -> Siap Pakai
    else                     lcd.print("+Air Twr "); // Payau -> Campur Air Tawar
  }

  // 5. Alert (LED Merah/Hijau/Biru & Buzzer)
  controlAlerts(phValue);
  delay(100);
}

// ISRs
void IRAM_ATTR isrSawah() {
  pendingModeSelect = 0;
  interruptTriggered = true;
}
void IRAM_ATTR isrSumur() {
  pendingModeSelect = 1;
  interruptTriggered = true;
}
void IRAM_ATTR isrKolam() {
  pendingModeSelect = 2;
  interruptTriggered = true;
}
void IRAM_ATTR isrCal()   {
  pendingModeSelect = 4;
  interruptTriggered = true;
}

void loadCalibration() {
  preferences.begin("ph-data", true); calibrationOffset = preferences.getFloat("offset", 0.0); preferences.end();
}
void saveCalibration() {
  preferences.begin("ph-data", false); preferences.putFloat("offset", calibrationOffset); preferences.end();
}

// --- SETUP ---
void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  lcd.init(); lcd.backlight();
  lcd.clear(); lcd.print("System Booting..");
  SerialGSM.begin(9600, SERIAL_8N1, RX_GSM, TX_GSM);
  delay(3000);

  modem.restart();
  modem.waitForNetwork(60000L);

  loadCalibration();

  pinMode(PIN_RELAY, OUTPUT); digitalWrite(PIN_RELAY, HIGH);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_R, OUTPUT); pinMode(PIN_LED_G, OUTPUT); pinMode(PIN_LED_B, OUTPUT);
  pinMode(BTN_SAWAH, INPUT_PULLUP); pinMode(BTN_SUMUR, INPUT_PULLUP);
  pinMode(BTN_KOLAM, INPUT_PULLUP); pinMode(BTN_OK, INPUT_PULLUP); pinMode(BTN_CAL_PIN, INPUT_PULLUP);

  attachInterrupt(digitalPinToInterrupt(BTN_SAWAH), isrSawah, FALLING);
  attachInterrupt(digitalPinToInterrupt(BTN_SUMUR), isrSumur, FALLING);
  attachInterrupt(digitalPinToInterrupt(BTN_KOLAM), isrKolam, FALLING);
  attachInterrupt(digitalPinToInterrupt(BTN_CAL_PIN), isrCal, FALLING);

  lcd.clear(); lcd.print("SIAP DIGUNAKAN"); delay(1000); lcd.clear();
}

// --- DISPLAY WRAPPER (ANTI-GHOSTING VERSION) ---
void displayLCD() {
  // Hanya menampilkan data dasar di mode IoT, mode manual punya tampilan sendiri

  // Baris 1: Status (Pastikan menghapus sisa karakter dengan spasi)
  lcd.setCursor(0, 0);
  lcd.print("IoT Running...  "); // Spasi di belakang penting!

  // Baris 2: Data Sensor (Kita bagi area kiri dan kanan agar rapi)

  // --- AREA KIRI: pH (Kolom 0-7) ---
  lcd.setCursor(0, 1);
  lcd.print("pH:");
  lcd.print(phValue, 1);
  lcd.print(" "); // Spasi pemisah kecil

  // --- AREA KANAN: Level Air (Kolom 9-15) ---
  // Kita set kursor manual ke kolom 9 agar posisi "L:" tidak goyang meski nilai pH berubah
  lcd.setCursor(9, 1);
  lcd.print("L:");
  lcd.print(waterLevel, 0); // Menampilkan jarak dalam cm

  // [PENTING] Tambahkan spasi kosong di akhir untuk menghapus "hantu" angka lama
  // Misal angka lama 125 (3 digit), angka baru 5 (1 digit)
  // Tanpa spasi: 525 (Salah)
  // Dengan spasi: 5   (Benar)
  lcd.print("cm ");
}

// --- MAIN LOOP ---
void loop() {
  if (interruptTriggered) handleButtonPress();

  if (currentSysMode == MODE_MANUAL) {
    runManualMode();
  } else {
    // ==========================================
    // ===            MODE IOT                ===
    // ==========================================

    // 1. Baca Sensor
    phValue = readRawPH() + calibrationOffset; 
    waterLevel = readWaterLevel();
    int bat = getBatteryPercentage(readBatteryVoltage()); 

    checkAlarm(phValue);
    displayLCD();

    // 2. Pengiriman Data
    if (millis() - lastSendTime > sendInterval) {
      
      if (!modem.isGprsConnected()) {
        Serial.println("GPRS putus, reconnecting...");
        modem.gprsConnect(apn, "", "");
        return;
      }

      int signal = modem.getSignalQuality();

      // --- [LOGIKA PENGIRIMAN CERDAS - THE FIX] ---
      bool physicalState = (digitalRead(PIN_RELAY) == LOW); // True jika Nyala Fisik
      bool reportStatus = false;

      // KUNCI PERBAIKAN:
      // Jika Server sedang mode HARDWARE (User tidak klik web), 
      // kita WAJIB lapor kondisi fisik murni. Jangan pakai memori software yang mungkin nyangkut.
      if (lastSyncMode == "HARDWARE_PRIORITY") {
         reportStatus = physicalState;
      } 
      // Jika Server sedang mode WEB (User baru klik),
      // kita boleh lapor 'True' jika software meminta True (walau fisik belum sempat nyala)
      else {
         reportStatus = physicalState || pumpStatus;
      }

      Serial.println("\n[UPLOAD]");
      
      String postData = "{";
      postData += "\"ph\":" + String(phValue, 2) + ",";
      postData += "\"battery\":" + String(bat) + ",";
      postData += "\"level\":" + String(waterLevel, 1) + ",";
      postData += "\"location\":\"" + currentLocLabel + "\",";
      postData += "\"signal\":" + String(signal) + ",";
      postData += "\"pump_status\":" + String(reportStatus ? "true" : "false");
      postData += "}";

      Serial.println(postData); // Debug JSON

      http.beginRequest();
      http.post(resource);
      http.sendHeader("Content-Type", "application/json");
      http.sendHeader("Content-Length", postData.length());
      http.beginBody();
      http.print(postData);
      http.endRequest();

      int statusCode = http.responseStatusCode();
      String responseBody = http.responseBody();
      
      // Print Debug Lebih Bersih
      Serial.print("Status: "); Serial.println(statusCode);
      Serial.print("Resp: "); Serial.println(responseBody);

      if (statusCode == 200) {
        responseBody.toUpperCase();

        // 1. UPDATE MODE SINKRONISASI (PENTING!)
        if (responseBody.indexOf("WEB_PRIORITY") >= 0) {
            lastSyncMode = "WEB_PRIORITY";
        } else {
            lastSyncMode = "HARDWARE_PRIORITY";
        }

        // 2. EKSEKUSI PERINTAH
        // ON COMMAND
        if (responseBody.indexOf("\"COMMAND\":\"ON\"") >= 0 || responseBody.indexOf("ON") >= 0) {
          if (responseBody.indexOf("OFF") == -1) {
             if (digitalRead(PIN_RELAY) != LOW) digitalWrite(PIN_RELAY, LOW); 
             pumpStatus = true;
             
             // Debugging message yang jujur
             if (lastSyncMode == "WEB_PRIORITY") Serial.println(">> ACTION: ON (Disuruh Web)");
             else Serial.println(">> ACTION: ON (Mengikuti Hardware)");
          }
        }

        // OFF COMMAND
        else if (responseBody.indexOf("\"COMMAND\":\"OFF\"") >= 0 || responseBody.indexOf("OFF") >= 0) {
          if (responseBody.indexOf("ON") == -1) {
             if (digitalRead(PIN_RELAY) != HIGH) digitalWrite(PIN_RELAY, HIGH);
             pumpStatus = false;
             
             if (lastSyncMode == "WEB_PRIORITY") Serial.println(">> ACTION: OFF (Disuruh Web)");
             else Serial.println(">> ACTION: OFF (Mengikuti Hardware)");
          }
        }
        
        // 3. FORCE SYNC (Anti Zombie)
        // Jika mode hardware, paksa software memory sama dengan fisik
        if (lastSyncMode == "HARDWARE_PRIORITY") {
            pumpStatus = physicalState;
        }
      }
      lastSendTime = millis();
    }
  }
}
