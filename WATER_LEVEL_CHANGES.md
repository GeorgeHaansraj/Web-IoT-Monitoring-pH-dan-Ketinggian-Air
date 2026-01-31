# 📊 Perubahan Sistem Level Air Dashboard

## 🔄 Dari Persentase ke Centimeter (cm)

### Sebelumnya (%)

```
Water Level: 46% (abstrak, sulit dipahami)
Visualisasi: Percentage bar 0-100%
```

### Sekarang (cm) ✅

```
Water Level: 45 cm (konkret dari sensor ultrasonik)
Visualisasi: Sensor level meter dengan grid markings
```

---

## 📈 Spesifikasi Pengukuran per Mode

### 🌾 Sawah Padi

| Kondisi       | Range        | Status           | Warna      |
| ------------- | ------------ | ---------------- | ---------- |
| Kritis        | < 15 cm      | 🔴 Kritis        | Merah      |
| Rendah        | 15-30 cm     | 🟠 Rendah        | Oranye     |
| **Optimal**   | **30-60 cm** | **🟢 Aman**      | **Hijau**  |
| Tinggi        | 60-75 cm     | 🔵 Tinggi        | Biru       |
| Sangat Tinggi | > 75 cm      | 🔷 Sangat Tinggi | Biru Gelap |

**Deskripsi**: Padi membutuhkan genangan air 30-60cm untuk pertumbuhan optimal. Di bawah 15cm padi akan mati, di atas 75cm akan merusak tanaman.

---

### 🐟 Kolam Ikan Patin

| Kondisi       | Range         | Status           | Warna      |
| ------------- | ------------- | ---------------- | ---------- |
| Kritis        | < 40 cm       | 🔴 Kritis        | Merah      |
| Rendah        | 40-80 cm      | 🟠 Rendah        | Oranye     |
| **Optimal**   | **80-130 cm** | **🟢 Aman**      | **Hijau**  |
| Tinggi        | 130-150 cm    | 🔵 Tinggi        | Biru       |
| Sangat Tinggi | > 150 cm      | 🔷 Sangat Tinggi | Biru Gelap |

**Deskripsi**: Ikan patin memerlukan kedalaman minimal 80cm. Kurang dari 40cm risiko ikan mati, lebih dari 150cm risiko overflow.

---

## 🎨 Komponen UI Baru

### WaterLevelMeter Component (`/components/visualizations/WaterLevelMeter.tsx`)

Fitur:

- ✅ Menampilkan nilai eksak dalam cm (floating point 1 desimal)
- ✅ Visual meter dengan grid markings (0, 25, 50, 75, 100%)
- ✅ Water fill animation dengan wave effect
- ✅ Color-coded berdasarkan status
- ✅ Status label (Kritis/Rendah/Optimal/Tinggi/Sangat Tinggi)
- ✅ Info tooltip dengan rentang optimal per mode
- ✅ Icon sensor ultrasonik

### Integrasi Dashboard

1. **Status Lahan Cards** - Menampilkan water level dalam cm
2. **Monitoring Section** - WaterLevelMeter untuk visualisasi detail sawah

---

## 🔌 API Endpoint

### POST `/api/water-level`

Hardware mengirim data level air dalam cm

**Request**:

```json
{
  "mode": "sawah",
  "level": 45.5,
  "location": "Lahan A",
  "deviceId": "device-001"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Data level air Sawah berhasil disimpan: 45.5cm",
  "reading": {
    "id": "...",
    "level": 45.5,
    "location": "Lahan A",
    "status": "normal",
    "timestamp": "2026-01-31T10:30:00Z"
  }
}
```

---

## 💾 Database Storage

### Tabel: `waterLevelReading`

```prisma
model WaterLevelReading {
  id        String   @id @default(cuid())
  level     Float    // Nilai dalam cm
  location  String
  status    String   // critical, low, normal, high, very_high
  deviceId  String?
  timestamp DateTime @default(now())
}
```

---

## 🚀 Fitur Baru

### Real-time Monitoring

- Hardware mengirim data setiap 3-5 detik via API
- Dashboard menerima dan menyimpan ke database NeonDB
- Visualisasi update real-time

### Auto Alert System

Sistem otomatis membuat alert jika:

- Status = critical/low → Alert Penting
- Status = high/very_high → Alert Informasi

Alert disimpan untuk historical tracking & analysis

### Status Tracking

Setiap pembacaan dicatat dengan:

- Nilai eksak (cm)
- Waktu pembacaan (timestamp)
- Status kondisi
- Device ID pengirim
- Lokasi/mode lahan

---

## 📱 Contoh Data Simulasi

### Sawah Default (dalam page.tsx)

```typescript
const [sawahWaterLevel, setSawahWaterLevel] = useState(45); // cm
// Range: 5-80 cm (dengan step ±3 cm per 3 detik)
```

### Kolam Default (dalam page.tsx)

```typescript
const [kolamWaterLevel, setKolamWaterLevel] = useState(120); // cm
// Range: 10-150 cm (dengan step ±4 cm per 3 detik)
```

---

## 🧪 Testing API

Gunakan file: `examples/test-water-level-api.sh`

```bash
# Test mengirim data berbagai kondisi
bash examples/test-water-level-api.sh
```

---

## 📋 Status Implementasi

✅ State management (cm-based)
✅ Komponen visualisasi baru (WaterLevelMeter)
✅ API endpoint untuk POST water level
✅ API endpoint untuk GET water level history
✅ Database schema (waterLevelReading)
✅ Auto alert generation
✅ Simulasi real-time data
✅ Status cards dengan water level info
✅ Dokumentasi lengkap

---

## 🔗 File Modifikasi

- `app/page.tsx` - Import WaterLevelMeter, update state & simulasi
- `components/visualizations/WaterLevelMeter.tsx` - Komponen baru
- `app/api/water-level/route.ts` - Update untuk cm-based logic
- `WATER_LEVEL_SYSTEM.md` - Dokumentasi komprehensif
- `examples/test-water-level-api.sh` - Testing script

---

**Siap untuk menerima data sensor ultrasonik dari hardware dalam satuan cm! 🎉**
