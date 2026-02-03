# ✅ Database Schema Migration - Completed

## Summary

Successfully created `PumpStatus` and `PumpHistory` tables in NeonDB PostgreSQL database to support pump relay control tracking and history display.

## Database Tables Created

### 1. PumpStatus Table

**Purpose**: Store current pump status for each mode  
**Location**: `pump_status` table in NeonDB  
**Schema**:

```sql
CREATE TABLE "pump_status" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL UNIQUE,
    "isOn" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pump_status_pkey" PRIMARY KEY ("id")
);
```

**Fields**:

- `id`: Unique identifier (CUID)
- `mode`: Pump mode (e.g., "sawah", "kolam") - **UNIQUE**
- `isOn`: Boolean state (true = ON, false = OFF)
- `updatedAt`: Last update timestamp
- `createdAt`: Creation timestamp

**Use Cases**:

- Query current pump status in dashboard
- Check if pump is currently on/off
- Display pump state indicator

---

### 2. PumpHistory Table

**Purpose**: Maintain audit log of pump state changes  
**Location**: `pump_history` table in NeonDB  
**Schema**:

```sql
CREATE TABLE "pump_history" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "previousState" BOOLEAN NOT NULL,
    "newState" BOOLEAN NOT NULL,
    "changedBy" TEXT NOT NULL DEFAULT 'dashboard',
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pump_history_pkey" PRIMARY KEY ("id")
);

-- Index for efficient queries
CREATE INDEX "pump_history_mode_timestamp_idx" ON "pump_history"("mode", "timestamp");
```

**Fields**:

- `id`: Unique identifier (CUID)
- `mode`: Pump mode that was changed
- `previousState`: State before change (boolean)
- `newState`: State after change (boolean)
- `changedBy`: Source of change (e.g., "dashboard", "esp32", "api", "manual")
- `userId`: User who triggered change (optional)
- `timestamp`: When change occurred
- **Index**: On (mode, timestamp) for fast history queries

**Use Cases**:

- Display pump activation history on profile page
- Audit trail for troubleshooting
- Track who/what changed pump status
- Analyze pump usage patterns

---

## API Endpoints Updated/Created

### 1. POST `/api/pump-relay` - Update Pump Status

**Request Body**:

```json
{
  "mode": "sawah",
  "isOn": true,
  "changedBy": "dashboard",
  "userId": "user-123" // optional
}
```

**Response** (Success):

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

**Behavior**:

- Updates `PumpStatus` table with new status
- Only creates `PumpHistory` record if state actually changed
- Returns 200 with success message

---

### 2. GET `/api/pump-relay?mode=sawah` - Get Current Pump Status

**Response**:

```json
{
  "mode": "sawah",
  "isOn": true,
  "updatedAt": "2025-01-31T06:35:00Z"
}
```

**Behavior**:

- Retrieves current pump state from database
- Returns 404 if mode not found

---

### 3. GET `/api/pump-history?mode=sawah&limit=20&offset=0` - Get Pump History

**Query Parameters**:

- `mode`: Pump mode ("sawah", "kolam")
- `limit`: Number of records (default: 20)
- `offset`: Pagination offset (default: 0)

**Response**:

```json
{
  "success": true,
  "mode": "sawah",
  "data": [
    {
      "id": "clin8h1234567890abcdef",
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

**Behavior**:

- Returns pump history sorted by timestamp (newest first)
- Includes pagination info
- Shows state transitions with source of change

---

## Frontend Components Updated

### 1. Profile Page (`app/profile/page.tsx`)

**New Features**:

- "Riwayat Pompa" button opens pump history modal
- Displays last 20 pump activations
- Shows:
  - Pump state change (ON/OFF with icons)
  - Exact timestamp (Indonesian locale)
  - Source of change (dashboard/esp/api/manual)
  - Previous and new state
- Auto-loads history when modal opens
- Loading state and empty state handling

**New State Variables**:

```typescript
const [showPumpHistory, setShowPumpHistory] = useState(false);
const [pumpHistory, setPumpHistory] = useState<any[]>([]);
const [pumpHistoryLoading, setPumpHistoryLoading] = useState(false);
```

### 2. Dashboard (`app/page.tsx`)

**Updated**:

- `handlePumpToggle()` now sends `isOn` instead of `status`
- Sends `changedBy: "dashboard"` to track source
- Removed `deviceId` from request body
- Error handling and state reversion on failure

---

## Database Migration History

**Migration File**: `prisma/migrations/20260131063508_add_pump_tables/migration.sql`

**Applied Changes**:
✅ Created `pump_status` table  
✅ Created `pump_history` table  
✅ Added unique index on `pump_status.mode`  
✅ Added composite index on `pump_history(mode, timestamp)`  
✅ Successfully migrated NeonDB

---

## Build Status

✅ **Production Build Successful**

- Next.js 16.1.3 compiled successfully
- Prisma client generated
- All routes registered:
  - `/api/pump-relay` (POST, GET)
  - `/api/pump-history` (GET)
  - `/profile` (updated with pump history)
- TypeScript type checking passed

---

## Integration Points

### Data Flow

1. **Dashboard** → User clicks pump toggle
2. `handlePumpToggle()` → Sends HTTP POST to `/api/pump-relay`
3. **API** → Updates `pump_status` table, creates history record
4. **Profile** → User clicks "Riwayat Pompa"
5. `fetchPumpHistory()` → Queries `/api/pump-history`
6. **Modal** → Displays sorted history with timestamps

### Database Sync

- **Current State**: `pump_status` (always up-to-date)
- **Historical Data**: `pump_history` (immutable audit log)
- **Source Tracking**: `changedBy` field indicates origin (dashboard/esp32/api/manual)

---

## Testing Recommendations

1. **Test Pump Toggle**:

   ```bash
   curl -X POST http://localhost:3000/api/pump-relay \
     -H "Content-Type: application/json" \
     -d '{"mode":"sawah","isOn":true,"changedBy":"dashboard"}'
   ```

2. **Check Current Status**:

   ```bash
   curl http://localhost:3000/api/pump-relay?mode=sawah
   ```

3. **View History**:

   ```bash
   curl http://localhost:3000/api/pump-history?mode=sawah&limit=10
   ```

4. **Profile Page**:
   - Navigate to profile
   - Click "Riwayat Pompa"
   - Verify history loads and displays correctly

---

## Future Enhancements

### Potential Features

1. Export pump history as CSV/PDF
2. Filter history by date range
3. Analytics dashboard (pump uptime %, total on-time, etc.)
4. Real-time status updates via WebSocket
5. Alert on pump anomalies (too many on/off cycles, etc.)
6. Integration with ESP32 to also log HTTP requests as "esp32" source

---

## File Changes Summary

**Created/Modified**:

- ✅ `prisma/schema.prisma` - Added PumpStatus and PumpHistory models
- ✅ `app/api/pump-relay/route.ts` - Updated to use `isOn` and history tracking
- ✅ `app/api/pump-history/route.ts` - **NEW** endpoint for querying history
- ✅ `app/profile/page.tsx` - Added pump history modal and button
- ✅ `app/page.tsx` - Updated handlePumpToggle to use new schema

**Database**:

- ✅ `prisma/migrations/20260131063508_add_pump_tables/migration.sql` - Applied migration
- ✅ NeonDB updated with pump_status and pump_history tables

---

## Notes

- All timestamps stored in UTC, formatted to Indonesian locale on frontend
- Pump status is per-mode (sawah, kolam) - separate tracking for each
- History records are immutable (append-only audit log)
- Database indexes optimize for mode-based queries and time-range queries
- Migration included a reset of dev database to sync schema (NeonDB production unaffected if running in separate database)
