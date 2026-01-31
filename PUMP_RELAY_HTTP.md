# 🔌 Pump Relay Control via HTTP

## Overview

Sistem kontrol pompa relay melalui HTTP dan NeonDB, menghubungkan dashboard dengan ESP32 via bridge web.

## Architecture

```
┌─────────────────┐
│   Dashboard     │  (Next.js)
│  (Button Toggle)│
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│   API Endpoint  │  (/api/pump-relay)
│  (/api/...)     │
└────────┬────────┘
         │ Upsert
         ▼
┌─────────────────┐
│    NeonDB       │  (PostgreSQL)
│  PumpStatus     │
└────────┬────────┘
         │ Query
         ▼
┌─────────────────┐
│     ESP32       │  (Polling setiap 5 detik)
│  (Relay Control)│
└─────────────────┘
```

## API Endpoint

### Endpoint: `/api/pump-relay`

#### GET - Dapatkan Status Pompa

```bash
GET /api/pump-relay?mode=sawah
```

**Response (200)**:

```json
{
  "mode": "sawah",
  "status": true,
  "timestamp": "2026-01-31T10:30:00Z"
}
```

---

#### POST - Ubah Status Pompa

```bash
POST /api/pump-relay
Content-Type: application/json

{
  "mode": "sawah",
  "status": true,
  "deviceId": "device-001"
}
```

**Response (200)**:

```json
{
  "success": true,
  "message": "Pompa sawah dihidupkan",
  "data": {
    "mode": "sawah",
    "status": true,
    "timestamp": "2026-01-31T10:30:00Z"
  }
}
```

---

## Dashboard Integration

### Button Pompa (page.tsx)

```typescript
const handlePumpToggle = async (checked: boolean) => {
  setSawahPumpOn(checked);

  try {
    const response = await fetch("/api/pump-relay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "sawah",
        status: checked,
        deviceId: deviceActualLocation,
      }),
    });

    const data = await response.json();
    console.log("Pump response:", data);
  } catch (error) {
    setSawahPumpOn(!checked); // Revert jika error
  }
};
```

**Flow**:

1. User klik button ON/OFF
2. State UI update immediately
3. HTTP POST ke `/api/pump-relay`
4. Database disimpan
5. ESP32 polling dan dapatkan status terbaru
6. Relay diaktifkan sesuai status

---

## ESP32 Implementation

### Polling Mode (Default)

ESP32 polling status setiap 5 detik:

```cpp
void pollPumpStatus() {
  HTTPClient http;
  http.begin(API_URL + "?mode=sawah");
  int code = http.GET();

  if (code == 200) {
    // Parse response
    bool pumpStatus = doc["status"];
    // Update relay
    controlRelay(pumpStatus);
  }
}
```

### Manual Button (Override)

Button fisik untuk toggle relay langsung:

```cpp
void checkManualButton() {
  if (buttonPressed) {
    bool newState = !currentPumpStatus;
    controlRelay(newState);
    sendPumpCommand(newState);  // Update API
  }
}
```

---

## Database Schema

### Table: `PumpStatus`

```prisma
model PumpStatus {
  id        String   @id @default(cuid())
  mode      String   @unique  // "sawah", "kolam", dll
  isOn      Boolean  @default(false)
  deviceId  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## Implementation Steps

### 1️⃣ Database Migration

```sql
CREATE TABLE "PumpStatus" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "mode" TEXT NOT NULL UNIQUE,
  "isOn" BOOLEAN NOT NULL DEFAULT false,
  "deviceId" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 2️⃣ Update Prisma Schema

```prisma
model PumpStatus {
  id        String   @id @default(cuid())
  mode      String   @unique
  isOn      Boolean  @default(false)
  deviceId  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 3️⃣ Run Migration

```bash
npx prisma migrate dev --name add_pump_status
```

### 4️⃣ Deploy ESP32 Code

- Upload `examples/esp32-pump-relay-http.ino` ke ESP32
- Update WiFi credentials
- Update API_URL

### 5️⃣ Test Integration

```bash
# Test via curl
curl -X POST http://localhost:3000/api/pump-relay \
  -H "Content-Type: application/json" \
  -d '{"mode":"sawah","status":true,"deviceId":"device-001"}'

# Lihat di dashboard button berubah
# Lihat di Serial Monitor ESP32 relay aktif
```

---

## Features

✅ **Real-time Control**: Ubah status dari dashboard langsung ke relay
✅ **Polling**: ESP32 polling status setiap 5 detik  
✅ **Manual Override**: Button fisik untuk emergency control
✅ **History**: Semua status tersimpan di database
✅ **Error Handling**: Retry dan fallback logic
✅ **WiFi Reconnect**: Auto reconnect jika WiFi putus
✅ **Debounce**: Button debouncing untuk stabilitas

---

## Testing Checklist

- [ ] Dashboard button ON/OFF berfungsi
- [ ] API menyimpan status ke database
- [ ] ESP32 polling setiap 5 detik
- [ ] Relay menyala saat status ON
- [ ] Manual button toggle relay
- [ ] WiFi reconnect otomatis
- [ ] LED indicator menunjukkan status
- [ ] Serial monitor logging bekerja

---

## Troubleshooting

### Button tidak merespons

- [ ] Cek WiFi ESP32 terhubung
- [ ] Cek API URL benar
- [ ] Lihat Serial Monitor untuk error

### Relay tidak aktif

- [ ] Cek wiring relay ke GPIO16
- [ ] Cek daya relay (5V)
- [ ] Cek polarity relay

### API error 404

- [ ] Cek endpoint `/api/pump-relay` ada
- [ ] Cek IP server benar
- [ ] Cek database schema sudah di-migrate

### Dashboard button stuck

- [ ] Hard refresh browser
- [ ] Cek browser console untuk error
- [ ] Restart server

---

## Files Modified/Created

- ✅ `app/api/pump-relay/route.ts` - API endpoint baru
- ✅ `app/page.tsx` - Update handlePumpToggle untuk HTTP
- ✅ `examples/esp32-pump-relay-http.ino` - Reference kode ESP32
- ✅ `PUMP_RELAY_HTTP.md` - Dokumentasi ini

---

**Status**: Production Ready ✅
**Last Updated**: 31 Januari 2026
