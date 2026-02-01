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
//const char apn[]      = "indosatgprs";
const char apn[]      = "internet";
const char* server    = "20.2.138.40"; // URL Bridge PHP
/*const char* broker    = "fad47439366b441282ea90ccce8435fd.s1.eu.hivemq.cloud"; // Cluster URL HiveMQ
  const char* mqtt_user = "hardware_esp32";           // Username MQTT
  const char* mqtt_pass = "Tematikgokelompok31itera";           // Password MQTT */
const char* broker    = "broker.emqx.io";
//const char* mqtt_user = ""; // Kosongkan
//const char* mqtt_pass = ""; // Kosongkan
const char* devId     = "ESP32-KKN-01-tematikgo";

// --- 2. DEFINISI PIN ---
#define RX_GSM 26
#define TX_GSM 27
#define PIN_RELAY1 4
#define PIN_RELAY2 18
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
HttpClient    http(gsm_client, server, 80); // http port
//TinyGsmClientSecure gsm_client(modem); // "Secure"
//HttpClient    http(gsm_client, server, 443); // https port
//PubSubClient  mqtt(gsm_client);
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
float calibrationOffset = 0.0;
unsigned long iotStartTime = 0;
unsigned long lastSendTime = 0;
bool lcdOffIoT = false;
int relay2State = HIGH;
String currentLocLabel = "sawah";

float limitBawah = 6.0;
float limitAtas = 8.0;
unsigned long buzzerStartTime = 0;
bool buzzerActive = false;
bool isAbnormalState = false;

// --- 4. FUNGSI PENGIRIM DATA (VERCEL HTTP) ---
void sendToVercel(String endpoint, String jsonPayload) {
  Serial.println("\n[HTTP] >>> MEMULAI PENGIRIMAN KE VERCEL...");
  Serial.print("[HTTP] Endpoint: "); Serial.println(endpoint);
  Serial.print("[HTTP] Payload: "); Serial.println(jsonPayload);

  http.beginRequest();
  http.post(endpoint);
  http.sendHeader("Content-Type", "application/json");
  http.sendHeader("Content-Length", jsonPayload.length());
  http.beginBody();
  http.print(jsonPayload);
  http.endRequest();

  int statusCode = http.responseStatusCode();
  Serial.print("[HTTP] <<< BERHASIL! Status Code: "); Serial.println(statusCode);
  Serial.println();
}

// Fungsi pengurutan untuk filter median
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

float readRawPH() {
  const int numSamples = 30; // Ambil 30 sampel
  int samples[numSamples];

  // 1. Ambil data mentah
  for (int i = 0; i < numSamples; i++) {
    samples[i] = analogRead(PIN_PH);
    delay(5);
  }

  // 2. Urutkan data dari kecil ke besar (Sorting)
  sortArray(samples, numSamples);

  // 3. Ambil nilai tengah (Median) untuk membuang noise yang lompat
  // Kita ambil rata-rata dari 6 data di tengah-tengah array
  long middleTotal = 0;
  for (int i = 12; i < 18; i++) {
    middleTotal += samples[i];
  }
  float averageRaw = middleTotal / 6.0;

  // 4. Konversi ke Voltase
  float voltage = (averageRaw / 4095.0) * 3.3;

  // 5. Rumus Kalibrasi Khusus (Slope -90.19)
  float phCalculated = (-4.91 * voltage) + 18.36;

  // 6. Kunci Batas (Agar tidak ada negatif)
  if (phCalculated < 0) phCalculated = 0.0;
  if (phCalculated > 14) phCalculated = 14.0;

  return phCalculated;
}

// --- 5. LOGIKA SENSOR & BATERAI (KALIBRASI) ---
/*float readRawPH() {
  long total = 0;

  // 1. MODIFIKASI SAMPEL: Diubah dari 10 jadi 50
  // Tujuannya: Agar angka pH di LCD tidak loncat-loncat (karena slope sangat tajam)
  for (int i = 0; i < 50; i++) {
    total += analogRead(PIN_PH);
    delay(5); // Total waktu baca = 50 * 5ms = 250ms (Sangat Cepat)
  }

  // 2. MODIFIKASI PEMBAGI:
  // Karena sampelnya 50, maka pembaginya WAJIB 50.0 juga
  float voltage = (total / 50.0) * (3.3 / 4095.0);

  // 3. MODIFIKASI RUMUS (PENTING!):
  // Hapus rumus lama "3.5 * voltage". Itu salah.
  // Gunakan rumus hasil hitungan data Anda tadi (Slope: -90.19, Intercept: 301.64)

  float phCalculated = (-90.19 * voltage) + 301.64;

  return phCalculated;
  } */

float readBatteryVoltage() {
  float totalVoltage = 0;
  int sampleCount = 0;

  // Variabel 'static' ini akan menyimpan nilai tegangan terakhir yang valid.
  // Nilai awalnya kita set aman di 3.7V.
  // Variabel ini tidak akan hilang/reset meskipun fungsi selesai dijalankan.
  static float lastValidVoltage = 3.7;

  // 1. PENGAMBILAN SAMPEL
  for (int i = 0; i < 20; i++) {
    int raw = analogRead(PIN_BATT);

    // Konversi Raw ke Voltase Dasar
    float instantVoltage = (raw / 4095.0) * 3.3;

    // 2. KALIBRASI BARU (Berdasarkan data 3.74V vs 2.11V)
    // Faktor diubah dari 1.20 menjadi 2.13
    instantVoltage = instantVoltage * 2.18;

    // 3. FILTER NOISE/DROP
    // Jika tegangan terbaca > 1.0V, kita anggap data valid.
    // Jika di bawah 1.0V, kita anggap itu drop sesaat karena modem nyala.
    if (instantVoltage > 1.0) {
      totalVoltage += instantVoltage;
      sampleCount++;
    }
    delay(3);
  }

  // 4. LOGIKA ANTI-GLITCH (PENTING!)
  // Jika sampleCount == 0, artinya SEMUA bacaan error (drop parah saat kirim data).
  // Jangan return 0! Return nilai terakhir yang bagus agar LCD tidak kaget jadi 0%.
  if (sampleCount == 0) {
    return lastValidVoltage;
  }

  // Hitung rata-rata
  float finalVoltage = totalVoltage / sampleCount;

  // Update nilai terakhir yang valid untuk penggunaan berikutnya
  lastValidVoltage = finalVoltage;

  return finalVoltage;
}

int getBatteryPercentage(float voltage) {
  // Pastikan persentase tidak minus atau lebih dari 100
  int percentage = 0;

  // Logika Persentase "Safety Margin" SIM800L
  // 100% = 4.15V (Baterai Penuh)
  if (voltage >= 4.15) {
    percentage = 100;
  }
  // 50% - 100% (Range Atas: 3.75V - 4.15V)
  else if (voltage >= 3.75) {
    percentage = (int)((voltage - 3.75) * (100 - 50) / (4.15 - 3.75) + 50);
  }
  // 0% - 50% (Range Bawah: 3.40V - 3.75V)
  // Batas bawah 3.40V dipilih agar modem tidak mati mendadak
  else if (voltage >= 3.40) {
    percentage = (int)((voltage - 3.40) * (50 - 0) / (3.75 - 3.40) + 0);
  }
  // Di bawah 3.40V dianggap 0% (Kritis untuk Modem)
  else {
    percentage = 0;
  }

  return percentage;
}

// --- 6. LOGIKA TOMBOL & PERUBAHAN MODE (HANDLE BUTTON) ---
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
  digitalWrite(PIN_BUZZER, HIGH); delay(50); digitalWrite(PIN_BUZZER, LOW);

  unsigned long startHold = millis();
  bool actionReady = false;
  bool specialAction = false;

  while (digitalRead(pinTarget) == LOW) {
    unsigned long duration = millis() - startHold;
    if (duration > 3000 && duration < 5000 && !actionReady) {
      actionReady = true;
      digitalWrite(PIN_BUZZER, HIGH); delay(100); digitalWrite(PIN_BUZZER, LOW);
      lcd.clear();
      if (selectedModeID == 4) {
        lcd.print("Lepas: Kalibrasi");
        lcd.setCursor(0, 1);
        lcd.print("Tahan: Pompa");
      }
      else if (selectedModeID == 0) {
        lcd.print("Lepas: SAWAH");
        lcd.setCursor(0, 1);
        lcd.print("Tahan: IOT >5d");
      }
      else {
        lcd.print("LEPAS -> OK");
        lcd.setCursor(0, 1);
        lcd.print(namaMode);
      }
    }
    if (duration > 5000) {
      if (selectedModeID == 4) {
        toggleRelay2();
        specialAction = true;
        break;
      }
      if (selectedModeID == 0) {
        selectedModeID = 3; namaMode = "Mode IOT";
        lcd.clear(); lcd.print("CHANGE TO IOT!"); specialAction = true;
        executeStateChange(3); interruptTriggered = false; return;
      }
    }
    delay(10);
  }

  if (actionReady && !specialAction) {
    lcd.clear(); lcd.print("Konfirmasi: OK?"); lcd.setCursor(0, 1); lcd.print("-> "); lcd.print(namaMode);
    unsigned long waitOK = millis(); bool confirmed = false;
    while (millis() - waitOK < 5000) {
      if (digitalRead(BTN_OK) == LOW) {
        confirmed = true;
        break;
      }
    }
    if (confirmed) executeStateChange(selectedModeID);
  }
  interruptTriggered = false; pendingModeSelect = -1; lcd.clear();
}

void executeStateChange(int modeID) {
  // Bunyikan buzzer pendek sebagai feedback tombol ditekan
  digitalWrite(PIN_BUZZER, HIGH); delay(100); digitalWrite(PIN_BUZZER, LOW);

  if (modeID == 4) { // --- MODE KALIBRASI ---
    lcd.clear(); lcd.print("Kalibrasi...");
    float totalVoltage = 0;
    // Ambil sampel rata-rata
    for (int i = 0; i < 10; i++) {
      totalVoltage += (analogRead(PIN_PH) * (3.3 / 4095.0));
      delay(20);
    }
    // Hitung offset baru
    calibrationOffset = 6.86 - (3.5 * (totalVoltage / 10.0));
    saveCalibration();
    lcd.clear(); lcd.print("Kalibrasi OK!"); delay(2000);

  } else if (modeID == 3) { // --- MASUK MODE IOT ---
    currentSysMode = MODE_IOT_INIT;
    iotStartTime = millis();

    // Tampilan awal LCD
    lcd.clear(); lcd.print("Connecting IoT..");
    digitalWrite(PIN_RELAY1, LOW); // Nyalakan sistem utama

    // PENTING: Kita TIDAK melakukan gprsConnect di sini.
    // Kita serahkan sepenuhnya ke fungsi maintainIoTConnection() di loop()
    // agar sistem tidak macet (hanging) saat mencari sinyal.
    Serial.println("[SYSTEM] Berpindah ke Mode IoT. Menunggu Loop melakukan koneksi...");

  } else { // --- MODE MANUAL (Sawah/Sumur/Kolam) ---
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

    // CEK KONEKSI SEBELUM KIRIM
    // Mencegah error HTTP -3 atau RC=-2 jika GPRS sedang putus
    if (modem.isGprsConnected()) {
      Serial.println("[SYSTEM] Mengirim Laporan Mode Manual...");
      String payload = "{\"mode\":\"" + currentLocLabel + "\", \"battery\":" + String(getBatteryPercentage(readBatteryVoltage())) + "}";
      sendToVercel("/api/device", payload);
    } else {
      // Jika internet mati, cukup lapor di Serial, jangan paksa kirim
      Serial.println("[SYSTEM] Mode berubah, tapi GPRS Offline. Data tidak dikirim.");
    }
  }
}

// --- 7. RUN MANUAL MODE ---
// --- 7. RUN MANUAL MODE (YANG SUDAH DIPERBAIKI) ---
void runManualMode() {
  // 1. Update limit dan baca pH
  updateLimits();
  phValue = readRawPH() + calibrationOffset;

  // 2. Tampilkan Mode & Baterai di Baris Atas
  lcd.setCursor(0, 0);
  lcd.print("Md:");
  if (currentManualState == SAWAH) lcd.print("SAWAH");
  else if (currentManualState == SUMUR) lcd.print("SUMUR");
  else if (currentManualState == KOLAM) lcd.print("KOLAM");

  lcd.setCursor(12, 0);
  lcd.print(getBatteryPercentage(readBatteryVoltage())); lcd.print("%");

  // 3. Tampilkan pH di Baris Bawah
  lcd.setCursor(0, 1);
  lcd.print("pH:");
  lcd.print(phValue, 1);

  // 4. LOGIKA SARAN PENANGANAN (Kode Tambahan)
  if (phValue < limitBawah) {
    // Jika terlalu ASAM
    lcd.print(" +Kapur   ");
  }
  else if (phValue > limitAtas) {
    // Jika terlalu BASA
    lcd.print(" +Air/Trt ");
  }
  else {
    // Jika NORMAL
    lcd.print(" (Aman)   ");
  }

  // 5. Jalankan Buzzer/LED dan Delay
  controlAlerts(phValue);
  delay(100);
}

// --- 8. ISRs & SETUP ---
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

void setup() {
  // 1. Setup Serial & Resolusi ADC
  Serial.begin(115200);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  delay(1000);

  // 2. Setup LCD Lebih Awal (Agar bisa lihat status booting)
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("System Booting..");

  Serial.println("\n--- SISTEM DIMULAI ---");

  // 3. Mulai Komunikasi Serial ke SIM800L
  // Pastikan baudrate 9600 (standar SIM800L)
  SerialGSM.begin(9600, SERIAL_8N1, RX_GSM, TX_GSM);
  delay(3000); // Beri waktu SIM800L menyalakan radio-nya

  // --- BAGIAN KRUSIAL (PERBAIKAN UTAMA) ---

  // A. Restart Modem (Wajib untuk TinyGSM)
  // Ini memaksa library mengenali modem sebelum minta data lain
  Serial.println("[INIT] Merestart Modem...");
  lcd.setCursor(0, 1); lcd.print("Init Modem...");

  if (!modem.restart()) {
    Serial.println("[ERROR] Modem tidak merespon! Cek kabel RX/TX/Power.");
    lcd.setCursor(0, 1); lcd.print("Modem Error!  ");
    // Kita biarkan lanjut, tapi biasanya ini tanda hardware bermasalah
  } else {
    Serial.println("[INIT] Modem OK. Info: " + modem.getModemInfo());
  }

  // B. Tunggu Jaringan (Solusi Sinyal 99)
  // Kode akan diam di sini maksimal 60 detik sampai dapat sinyal
  Serial.print("[INIT] Mencari Sinyal Operator...");
  lcd.setCursor(0, 1); lcd.print("Cari Sinyal...");

  if (!modem.waitForNetwork(60000L)) { // Timeout 60 detik
    Serial.println(" Gagal :(");
    lcd.setCursor(0, 1); lcd.print("No Signal!    ");
  } else {
    Serial.println(" BERHASIL!");
    lcd.setCursor(0, 1); lcd.print("Sinyal OK!    ");
  }

  // C. Cek Kualitas Sinyal Sekarang (Harusnya sudah bukan 99)
  int signalQuality = modem.getSignalQuality();
  Serial.print("[INIT] Kualitas Sinyal Akhir: ");
  Serial.println(signalQuality);

  // D. Setting Tambahan (SSL & GPRS)
  modem.sendAT("+CSSLCFG=\"sslversion\",0");
  modem.sendAT("+CSSLCFG=\"authmode\",0");

  // ----------------------------------------

  // 4. Setup Load Cell & Kalibrasi
  loadCalibration();
  calibrationOffset = 0.0;

  // 5. Setup Pin Hardware
  pinMode(PIN_RELAY1, OUTPUT); digitalWrite(PIN_RELAY1, HIGH);
  pinMode(PIN_RELAY2, OUTPUT); digitalWrite(PIN_RELAY2, HIGH);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(BTN_SAWAH, INPUT_PULLUP);
  pinMode(BTN_SUMUR, INPUT_PULLUP);
  pinMode(BTN_KOLAM, INPUT_PULLUP);
  pinMode(BTN_OK, INPUT_PULLUP);
  pinMode(BTN_CAL_PIN, INPUT_PULLUP);

  // 6. Setup Interrupt Tombol
  attachInterrupt(digitalPinToInterrupt(BTN_SAWAH), isrSawah, FALLING);
  attachInterrupt(digitalPinToInterrupt(BTN_SUMUR), isrSumur, FALLING);
  attachInterrupt(digitalPinToInterrupt(BTN_KOLAM), isrKolam, FALLING);
  attachInterrupt(digitalPinToInterrupt(BTN_CAL_PIN), isrCal, FALLING);

  // 7. Setup MQTT (Disiapkan tapi belum konek)
  //mqtt.setServer(broker, 1883);
  //mqtt.setCallback(mqttCallback);

  // Tampilan Akhir Setup
  delay(1000);
  lcd.clear();
  lcd.print("SIAP DIGUNAKAN");
  delay(1000);
  lcd.clear();
}

void loop() {
  // 1. Selalu cek tombol di awal loop agar responsif
  if (interruptTriggered) handleButtonPress();

  if (currentSysMode == MODE_MANUAL) {
    runManualMode();
  } else {
    // 2. Kelola koneksi internet di latar belakang (Non-Blocking)
    maintainIoTConnection();

    // 3. BLOK LCD TERORGANISIR: Memisahkan indikator koneksi dan data sensor
    static unsigned long lastLcdUpdate = 0;
    if (millis() - lastLcdUpdate > 2000) {
      lastLcdUpdate = millis();

      // Baris Pertama: Status Koneksi
      lcd.setCursor(0, 0);
      if (modem.isGprsConnected()) {
        lcd.print("GPRS: ONLINE    "); // Spasi tambahan untuk menghapus teks lama
      } else {
        lcd.print("GPRS: CONNECTING");
      }

      // Baris Kedua: Monitoring Data (Hanya tampil jika sudah Online)
      lcd.setCursor(0, 1);
      if (modem.isGprsConnected()) {
        float currentPh = readRawPH() + calibrationOffset;
        lcd.print("pH:"); lcd.print(currentPh, 1);
        lcd.print(" | Bat:"); lcd.print(getBatteryPercentage(readBatteryVoltage()));
        lcd.print("%  ");
      } else {
        lcd.print("Mohon Tunggu... ");
      }
    }

    // 4. LOGIKA PENGIRIMAN: HANYA kirim jika GPRS sudah benar-benar siap
    unsigned long currentMillis = millis();
    if (currentMillis - lastSendTime > 20000 && modem.isGprsConnected()) {

      // A. Ambil Data
      float ph = readRawPH() + calibrationOffset;
      int bat = getBatteryPercentage(readBatteryVoltage());
      float level = readWaterLevel(); // <--- TAMBAHAN 1: Panggil fungsi level air

      // --- TAMBAHAN SERIAL DEBUGGING ---
      Serial.println("\n--- [PRE-FLIGHT DATA CHECK] ---");
      Serial.print("Target Location : "); Serial.println(currentLocLabel);
      Serial.print("Water Level (cm): "); Serial.println(level);
      Serial.print("pH Value        : "); Serial.println(ph);
      Serial.print("Battery         : "); Serial.print(bat); Serial.println("%");
      Serial.println("--------------------------------");

      // B. Kirim ke PHP Bridge (HTTP POST Biasa)
      Serial.println("[HTTP] Mengirim data ke Bridge PHP...");
      // Format data form-urlencoded (Ringan & Mudah dibaca PHP)
      // <--- TAMBAHAN 2: Tambahkan "&level=" + String(level) di bawah ini
      String postData = "ph=" + String(ph) + "&battery=" + String(bat) + "&location=" + currentLocLabel + "&level=" + String(level);

      http.beginRequest();
      http.post("/input.php"); // Pastikan nama file di hosting temanmu input.php
      http.sendHeader("Content-Type", "application/x-www-form-urlencoded");
      http.sendHeader("Content-Length", postData.length());
      http.beginBody();
      http.print(postData);

      // C. Kirim dan Tunggu Balasan (Untuk Fitur Kontrol Pompa)
      int statusCode = http.responseStatusCode();
      String responseBody = http.responseBody(); // Baca balasan server

      Serial.print("[HTTP] Status: "); Serial.println(statusCode);
      Serial.print("[HTTP] Balasan Server: "); Serial.println(responseBody);

      if (statusCode == 200) {
        // D. Cek Apakah Ada Perintah "POMPA_ON" di Balasan Server?
        // Kita cari manual string-nya biar gak ribet pakai library JSON lagi (hemat memori)
        if (responseBody.indexOf("POMPA_ON") >= 0) {
          Serial.println("[SYSTEM] Menerima Perintah: NYALAKAN POMPA!");
          digitalWrite(PIN_RELAY2, LOW); // Atau HIGH, sesuaikan modul relay (Aktif LOW/HIGH)
          relay2State = LOW; // Update status variabel lokal

          // Update LCD
          lcd.clear(); lcd.print("PERINTAH SERVER:"); lcd.setCursor(0, 1); lcd.print("POMPA ON");
          delay(2000); // Tahan sebentar biar terbaca
        }
        else if (responseBody.indexOf("POMPA_OFF") >= 0) {
          Serial.println("[SYSTEM] Menerima Perintah: MATIKAN POMPA!");
          digitalWrite(PIN_RELAY2, HIGH);
          relay2State = HIGH;
        }
      } else {
        Serial.println("[HTTP] Gagal kirim ke Bridge.");
      }

      float teganganTerbaca = readBatteryVoltage();
      Serial.print("[DEBUG] Tegangan Multitester: 3.95V | Tegangan ESP32: ");
      Serial.println(teganganTerbaca);

      // E. Reset Timer
      lastSendTime = currentMillis;
      delay(3000);
    }
  }
}

// Fungsi pembantu agar loop tetap bersih dan koneksi terjaga
void maintainIoTConnection() {
  static unsigned long lastRetry = 0;
  unsigned long currentMillis = millis();

  // 1. CEK KONEKSI GPRS (INTERNET) TERLEBIH DAHULU
  if (!modem.isGprsConnected()) {
    // Jika internet putus, jangan coba MQTT dulu. Fokus benerin internet.
    if (currentMillis - lastRetry > 10000) { // Coba ulang setiap 10 detik
      lastRetry = currentMillis;

      Serial.println("[SYSTEM] GPRS Terputus/Belum Konek. Mencoba menyambung...");

      // LOGIKA APN BARU (UNIVERSAL)
      // Menggunakan user "" dan pass "" agar lebih kompatibel
      if (modem.gprsConnect(apn, "", "")) {
        Serial.println("[SYSTEM] GPRS BERHASIL TERHUBUNG!");
      } else {
        Serial.println("[SYSTEM] GPRS Gagal. Cek Pulsa/Sinyal/Masa Aktif.");
      }
    }
    return; // Keluar dari fungsi, jangan lanjut ke MQTT kalau internet saja tidak ada
  }

  // 2. JIKA GPRS AMAN, BARU CEK KONEKSI MQTT
  /*if (!mqtt.connected()) {
    if (currentMillis - lastRetry > 15000) { // Coba reconnect MQTT tiap 15 detik
      lastRetry = currentMillis;
      Serial.println("[SYSTEM] GPRS Oke. Mencoba Reconnect MQTT...");
      reconnectMQTT();
    }
    } else {
    // 3. JIKA SEMUA AMAN, JALANKAN LOOP MQTT
    mqtt.loop();
    }*/
}

// --- 9. FUNGSI TAMBAHAN (MQTT & ALERTS) ---
//void mqttCallback(char* topic, byte* payload, unsigned int length) {
//  String msg; for (int i = 0; i < length; i++) msg += (char)payload[i];
//  if (msg == "CekpH") lastSendTime = 0; // Trigger kirim data instan ke WA
//}

/*void reconnectMQTT() {
  static unsigned long lastReconnectAttempt = 0;
  if (!mqtt.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > 5000) { // Coba tiap 5 detik tanpa 'while'
      lastReconnectAttempt = now;
      Serial.println("[MQTT] >>> MENCOBA KONEKSI KE BROKER HIVEMQ...");

      if (mqtt.connect(devId, mqtt_user, mqtt_pass)) {
        //mqtt.subscribe("monitoring/commands");
        mqtt.subscribe("tematikgo/kelompok31/perintah");
        Serial.println("[MQTT] <<< BERHASIL TERHUBUNG!");
      } else {
        Serial.print("[MQTT] GAGAL, RC="); Serial.println(mqtt.state());
      }
    }
  }
  }*/

void toggleRelay2() {
  relay2State = !relay2State; digitalWrite(PIN_RELAY2, relay2State);
  lcd.clear(); lcd.print("POMPA AIR"); lcd.setCursor(0, 1); lcd.print(relay2State == LOW ? "ON" : "OFF"); delay(1000);
}

void updateLimits() {
  if (currentManualState == SAWAH) {
    limitBawah = 5.5;
    limitAtas = 7.0;
  }
  else if (currentManualState == SUMUR) {
    limitBawah = 6.5;
    limitAtas = 8.5;
  }
  else {
    limitBawah = 7.0;
    limitAtas = 8.0;
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

void loadCalibration() {
  preferences.begin("ph-data", true);
  calibrationOffset = preferences.getFloat("offset", 0.0);
  preferences.end();
}
void saveCalibration() {
  preferences.begin("ph-data", false);
  preferences.putFloat("offset", calibrationOffset);
  preferences.end();
}
// --- TAMBAHAN: FUNGSI BACA LEVEL AIR ---
float readWaterLevel() {
  const int samples = 10; // Mengambil 10 sampel agar lebih stabil
  long totalDistance = 0;
  int validSamples = 0;

  for (int i = 0; i < samples; i++) {
    unsigned int distance = sonar.ping_cm();
    // Abaikan pembacaan 0 (error) atau pembacaan yang tidak masuk akal (misal > 400cm)
    if (distance > 0 && distance < 400) { 
      totalDistance += distance;
      validSamples++;
    }
    delay(20); // Jeda antar ping
  }

  if (validSamples == 0) return 0.0;

  // RATA-RATA JARAK (Inilah selisih permukaan air dari sensor)
  float averageDistance = (float)totalDistance / validSamples;

  return averageDistance; 
}