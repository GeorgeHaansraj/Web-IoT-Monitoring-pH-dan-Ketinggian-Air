# Quick Reference - Pump Relay System

## 🎯 What Was Done

✅ **Database Tables Created**:

- `pump_status` - Stores current ON/OFF status
- `pump_history` - Audit log of all status changes

✅ **API Endpoints Created**:

- `POST /api/pump-relay` - Update pump status
- `GET /api/pump-relay` - Get current status
- `GET /api/pump-history` - Get history with pagination

✅ **Frontend Updated**:

- Dashboard: Pump toggle sends HTTP requests
- Profile: New "Riwayat Pompa" (Pump History) section
- Shows: Status, timestamp, source (dashboard/esp32/etc)

✅ **Database Migration Applied**:

- Successfully migrated NeonDB
- Production build passes all tests

---

## 📱 How to Use

### From Dashboard (Web)

1. Click pump toggle on home page
2. API automatically updates `pump_status` table
3. History saved to `pump_history` with `changedBy: "dashboard"`

### From ESP32

1. Send HTTP POST to `/api/pump-relay`

```json
{
  "mode": "sawah",
  "isOn": true,
  "changedBy": "esp32"
}
```

2. Database updates automatically
3. Dashboard reflects changes in real-time

### View History

1. Go to Profile page
2. Click "Riwayat Pompa" button
3. See last 20 pump activations
4. Shows timestamp, state change, and source

---

## 🗄️ Database Schema

### pump_status

```
id (CUID)
mode (TEXT, UNIQUE) - "sawah" or "kolam"
isOn (BOOLEAN) - true=ON, false=OFF
updatedAt (TIMESTAMP)
createdAt (TIMESTAMP)
```

### pump_history

```
id (CUID)
mode (TEXT)
previousState (BOOLEAN) - before
newState (BOOLEAN) - after
changedBy (TEXT) - "dashboard", "esp32", "api", etc
userId (TEXT) - optional user ID
timestamp (TIMESTAMP)
INDEX on (mode, timestamp)
```

---

## 🔗 API Reference

### POST /api/pump-relay

Update pump status and create history record.

**Request**:

```bash
curl -X POST http://localhost:3000/api/pump-relay \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "sawah",
    "isOn": true,
    "changedBy": "dashboard"
  }'
```

**Response**:

```json
{
  "success": true,
  "message": "Pompa sawah dihidupkan",
  "data": {
    "mode": "sawah",
    "isOn": true,
    "updatedAt": "2025-01-31T06:35:00Z"
  }
}
```

---

### GET /api/pump-relay?mode=sawah

Get current pump status.

**Response**:

```json
{
  "mode": "sawah",
  "isOn": true,
  "updatedAt": "2025-01-31T06:35:00Z"
}
```

---

### GET /api/pump-history?mode=sawah&limit=20&offset=0

Get pump activation history.

**Response**:

```json
{
  "success": true,
  "mode": "sawah",
  "data": [
    {
      "id": "clin8h...",
      "mode": "sawah",
      "previousState": false,
      "newState": true,
      "changedBy": "dashboard",
      "userId": null,
      "timestamp": "2025-01-31T06:35:00Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## 📁 Files Changed

**New Files**:

- `app/api/pump-history/route.ts` - History API endpoint
- `PUMP_DATABASE_MIGRATION.md` - Detailed migration docs
- `ESP32_HTTP_INTEGRATION.md` - ESP32 code examples

**Modified Files**:

- `prisma/schema.prisma` - Added 2 models
- `app/api/pump-relay/route.ts` - Updated to use new schema
- `app/page.tsx` - Updated handlePumpToggle()
- `app/profile/page.tsx` - Added pump history modal

**Database**:

- Migration created: `20260131063508_add_pump_tables`
- Tables: `pump_status`, `pump_history`

---

## ✅ Test Checklist

- [x] Tables created in NeonDB
- [x] API endpoints functional
- [x] Dashboard builds without errors
- [x] Pump toggle sends HTTP requests
- [x] History modal displays records
- [x] Timestamps formatted correctly (Indonesian locale)
- [x] Source tracking (changedBy) working
- [x] Pagination ready for future use

---

## 🚀 Next Steps (Optional)

1. **Test with real ESP32**:
   - Upload provided Arduino code to ESP32
   - Verify pump toggles from ESP32
   - Check "esp32" entries in history

2. **Add Authentication**:
   - Add API key validation
   - Track which user toggled pump (if multiple users)

3. **Add Monitoring**:
   - Dashboard with pump uptime stats
   - Alert on abnormal patterns
   - Export history as CSV

4. **Enhanced History**:
   - Filter by date range
   - Filter by source (dashboard/esp32/etc)
   - Show duty cycle percentage

---

## 💡 Key Features

✨ **Automatic History Tracking**

- Every state change recorded
- Source tracked (dashboard, ESP32, API, manual)
- Timestamps for audit trail

✨ **Database-Driven**

- Persistent storage in NeonDB
- Survives app restarts
- Accessible from any device

✨ **HTTP-Based**

- No MQTT dependency
- Works with any HTTP client
- Easy to test with cURL/Postman

✨ **Profile Integration**

- View pump history without code access
- Beautiful modal interface
- Pagination for large histories

---

## 📞 Support

For issues:

1. Check API response codes (200, 400, 500)
2. Verify mode is "sawah" or "kolam"
3. Check NeonDB connection in Vercel logs
4. Ensure environment variables are set

Refer to `PUMP_DATABASE_MIGRATION.md` and `ESP32_HTTP_INTEGRATION.md` for detailed troubleshooting.
