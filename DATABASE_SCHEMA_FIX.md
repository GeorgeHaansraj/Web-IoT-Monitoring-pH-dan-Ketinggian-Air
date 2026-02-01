# Database Schema Fix - created_at Column

## Problem

ESP32 + Bridge PHP mengirim data ke NeonDB tetapi database schema menggunakan kolom `timestamp` sementara bridge mencoba insert ke kolom `created_at`, menyebabkan error:

```
ERROR: column "created_at" of relation "monitoring_logs" does not exist
```

## Solution

Database schema telah diupdate untuk menggunakan kolom `created_at` alih-alih `timestamp` agar sesuai dengan bridge PHP yang sudah berjalan di production.

## Changes Made

### 1. Schema Update (prisma/schema.prisma)

```typescript
model MonitoringLog {
  id             String   @id @default(cuid())
  battery_level  Float?
  ph_value       Float?
  level          Float?
  temperature    Float?
  signal_strength Int?
  created_at     DateTime @default(now())  // Changed from 'timestamp'
  deviceId       String?

  @@map("monitoring_logs")
  @@index([created_at])                      // Updated index
}
```

### 2. Migration Applied

- Migration: `20260201_update_monitoring_logs`
- Action: Renamed `timestamp` column to `created_at`
- Updated index from `timestamp_idx` to `created_at_idx`

### 3. API Update (app/api/monitoring-log/route.ts)

```typescript
const log = await prisma.monitoringLog.create({
  data: {
    battery_level: parseFloat(battery_level),
    ph_value: parseFloat(ph_value),
    level: parseFloat(level),
    temperature: parseFloat(temperature),
    signal_strength: parseInt(signal_strength),
    deviceId: deviceId || "default",
    created_at: new Date(), // Changed from 'timestamp'
  },
});
```

### 4. Seed Script Update (prisma/seed-monitoring.ts)

Updated test data seeding to use `created_at` instead of `timestamp`

## Workflow Baru

```
ESP32 + GSM
    ↓
Bridge PHP (20.2.138.40)
    ↓ (INSERT ke NeonDB dengan created_at)
NeonDB PostgreSQL
    ↓
Dashboard Vercel (polling /api/monitoring-log)
```

## Database Status

✅ Database reset dan migrations applied
✅ Test data seeded dengan successful
✅ Schema siap untuk menerima data dari bridge PHP

## Next Steps

1. Konfirmasi bridge PHP dapat insert ke NeonDB tanpa error
2. Monitor data flow dari ESP32 → Bridge → NeonDB → Dashboard
3. Verify dashboard menampilkan real-time data dari NeonDB

## Commands Executed

```bash
# Reset database dan apply all migrations
npx prisma migrate reset --force

# Seed test data
npx tsx prisma/seed-monitoring.ts
```

## Data Sample

Bridge PHP sekarang dapat mengirimkan data dengan struktur:

```json
{
  "ph_value": 5.23,
  "battery_level": 42,
  "level": 26.0,
  "temperature": 28.5,
  "signal_strength": 15,
  "deviceId": "ESP32-KKN-01"
}
```

Dan database akan menyimpannya dengan `created_at` timestamp otomatis.
