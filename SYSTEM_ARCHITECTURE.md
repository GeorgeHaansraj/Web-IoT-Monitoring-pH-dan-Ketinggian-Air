# System Architecture - Pump Relay Management

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         IoT Dashboard System                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend Layer (React)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────┐          ┌──────────────────────┐        │
│  │  Dashboard (/)       │          │  Profile (/profile)  │        │
│  ├──────────────────────┤          ├──────────────────────┤        │
│  │ • Monitoring        │          │ • User Info         │        │
│  │ • Mode Cards        │          │ • Settings          │        │
│  │ • Pump Toggle ──────┼──┐       │ • Riwayat Pompa ────┼─┐      │
│  │ • Water Level       │  │       │   (History Modal)    │ │      │
│  └──────────────────────┘  │       └──────────────────────┘ │      │
│                             │                                │      │
└─────────────────────────────┼────────────────────────────────┼──────┘
                              │                                │
                ┌─────────────┘                                │
                │                                              │
                ▼                                              ▼
        ┌──────────────────┐                        ┌──────────────────┐
        │  HTTP Request    │                        │  HTTP Request    │
        │ POST /api/pump-  │                        │ GET /api/pump-   │
        │      relay       │                        │      history     │
        └────────┬─────────┘                        └────────┬─────────┘
                 │                                           │
┌────────────────┴──────────────────────────────────────────┴──────────┐
│                        API Layer (Next.js)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────┐  ┌─────────────────────────────┐ │
│  │  /api/pump-relay/route.ts    │  │ /api/pump-history/route.ts  │ │
│  ├──────────────────────────────┤  ├─────────────────────────────┤ │
│  │ POST: Update Status          │  │ GET: Query History          │ │
│  │ • Validate request           │  │ • Filter by mode            │ │
│  │ • Get current status         │  │ • Paginate results          │ │
│  │ • Update pump_status         │  │ • Sort by timestamp DESC    │ │
│  │ • Create history record      │  │ • Return with pagination    │ │
│  │ • Return response            │  │                             │ │
│  │                              │  │                             │ │
│  │ GET: Get Current Status      │  │                             │ │
│  │ • Query pump_status by mode  │  │                             │ │
│  │ • Return isOn + timestamp    │  │                             │ │
│  └──────────────────────────────┘  └─────────────────────────────┘ │
│                    │                              │                 │
└────────────────────┼──────────────────────────────┼─────────────────┘
                     │                              │
                     ▼                              ▼
        ┌──────────────────────┐        ┌─────────────────────────┐
        │    Prisma Client     │        │   Prisma Client         │
        │  (Database ORM)      │        │  (Database ORM)         │
        └──────────┬───────────┘        └────────┬────────────────┘
                   │                             │
                   └─────────────┬───────────────┘
                                 │
┌─────────────────────────────────┴───────────────────────────────────┐
│                   NeonDB (PostgreSQL)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────┐    ┌───────────────────────────┐ │
│  │       pump_status            │    │    pump_history           │ │
│  ├──────────────────────────────┤    ├───────────────────────────┤ │
│  │ id          │ CUID           │    │ id         │ CUID         │ │
│  │ mode        │ TEXT (UNIQUE)  │    │ mode       │ TEXT        │ │
│  │ isOn        │ BOOLEAN        │    │ previousState │ BOOLEAN  │ │
│  │ updatedAt   │ TIMESTAMP      │    │ newState   │ BOOLEAN     │ │
│  │ createdAt   │ TIMESTAMP      │    │ changedBy  │ TEXT        │ │
│  │             │                │    │ userId     │ TEXT (NULL) │ │
│  │             │                │    │ timestamp  │ TIMESTAMP   │ │
│  │             │                │    │            │             │ │
│  │ UNIQUE(mode)                 │    │ INDEX(mode, timestamp)   │ │
│  │ Values:                      │    │ Values:                  │ │
│  │  - mode: "sawah"             │    │  - changedBy: dashboard, │ │
│  │  - isOn: true/false          │    │    esp32, api, manual    │ │
│  │                              │    │  - Store all changes     │ │
│  └──────────────────────────────┘    └───────────────────────────┘ │
│                                                                      │
│  Read/Write Pattern:                                                │
│  • Always read from pump_status for current state                   │
│  • Always append to pump_history for changes                        │
│  • Query history with LIMIT/OFFSET for pagination                   │
│  • Index ensures fast (mode, timestamp) lookups                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Scenario 1: Dashboard Pump Toggle

```
┌─────────────────────────────────────────────────────────────────────┐
│  USER ACTION: Click pump toggle on dashboard                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend: handlePumpToggle(checked)                                 │
│  • setSawahPumpOn(checked)  // Optimistic UI update                  │
│  • state: checked=true                                               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  HTTP Request                                                        │
│  POST /api/pump-relay                                                │
│  {                                                                   │
│    "mode": "sawah",                                                  │
│    "isOn": true,                                                     │
│    "changedBy": "dashboard"                                          │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Backend: POST /api/pump-relay                                       │
│                                                                      │
│  1. Get current status:                                              │
│     SELECT * FROM pump_status WHERE mode='sawah'                     │
│     Result: previousState=false                                      │
│                                                                      │
│  2. Update pump_status:                                              │
│     UPSERT INTO pump_status                                          │
│     SET isOn=true, updatedAt=NOW()                                   │
│                                                                      │
│  3. Create history record (only if changed):                         │
│     INSERT INTO pump_history (                                       │
│       mode, previousState, newState, changedBy, timestamp            │
│     )                                                                │
│     VALUES (                                                          │
│       'sawah', false, true, 'dashboard', NOW()                       │
│     )                                                                │
│                                                                      │
│  4. Return response:                                                 │
│     {                                                                │
│       "success": true,                                               │
│       "message": "Pompa sawah dihidupkan",                           │
│       "data": {                                                      │
│         "mode": "sawah",                                             │
│         "isOn": true,                                                │
│         "updatedAt": "2025-01-31T06:35:00Z"                          │
│       }                                                              │
│     }                                                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend: Process Response                                          │
│  • Toast notification shown                                          │
│  • State remains: sawahPumpOn = true                                 │
│  • UI reflects pump is ON                                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Scenario 2: View Pump History on Profile

```
┌─────────────────────────────────────────────────────────────────────┐
│  USER ACTION: Click "Riwayat Pompa" button on profile page           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend: setShowPumpHistory(true)                                  │
│  • Modal opens                                                       │
│  • Check if history already loaded                                   │
│  • If not: call fetchPumpHistory()                                   │
│  • Set pumpHistoryLoading = true                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  HTTP Request                                                        │
│  GET /api/pump-history?mode=sawah&limit=20&offset=0                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Backend: GET /api/pump-history                                      │
│                                                                      │
│  1. Extract query params:                                            │
│     mode = 'sawah'                                                   │
│     limit = 20                                                       │
│     offset = 0                                                       │
│                                                                      │
│  2. Query history (using composite index):                           │
│     SELECT * FROM pump_history                                       │
│     WHERE mode='sawah'                                               │
│     ORDER BY timestamp DESC                                          │
│     LIMIT 20 OFFSET 0                                                │
│                                                                      │
│  3. Count total for pagination:                                      │
│     SELECT COUNT(*) FROM pump_history                                │
│     WHERE mode='sawah'                                               │
│                                                                      │
│  4. Return response:                                                 │
│     {                                                                │
│       "success": true,                                               │
│       "mode": "sawah",                                               │
│       "data": [                                                      │
│         {                                                            │
│           "id": "clin8h1234567890abcdef",                            │
│           "mode": "sawah",                                           │
│           "previousState": false,                                    │
│           "newState": true,                                          │
│           "changedBy": "dashboard",                                  │
│           "userId": null,                                            │
│           "timestamp": "2025-01-31T06:35:00Z"                        │
│         },                                                           │
│         ...                                                          │
│       ],                                                             │
│       "pagination": {                                                │
│         "total": 42,                                                 │
│         "limit": 20,                                                 │
│         "offset": 0,                                                 │
│         "hasMore": true                                              │
│       }                                                              │
│     }                                                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend: Render History Modal                                      │
│  • setPumpHistory(data)                                              │
│  • Map through records and display:                                  │
│    - Status change icon (ON/OFF)                                     │
│    - Timestamp (formatted to Indonesian locale)                      │
│    - Source (changedBy)                                              │
│    - State transition (previousState → newState)                     │
│  • pumpHistoryLoading = false                                        │
│  • Modal displays 20 most recent changes                             │
│  • Pagination info ready for "Load More" (future feature)            │
└─────────────────────────────────────────────────────────────────────┘
```

### Scenario 3: ESP32 Sends Pump Status Update

```
┌─────────────────────────────────────────────────────────────────────┐
│  ESP32: Connected to WiFi, monitoring pump hardware                  │
│  Hardware event: Pump relay manually switched ON                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ESP32: Call setPumpStatus(true)                                     │
│  • Build JSON payload                                                │
│  • Set changedBy = "esp32"                                           │
│  • Include WiFi signal strength (optional)                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  HTTP Request (from ESP32)                                           │
│  POST /api/pump-relay                                                │
│  {                                                                   │
│    "mode": "sawah",                                                  │
│    "isOn": true,                                                     │
│    "changedBy": "esp32"                                              │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Backend: Process Request                                            │
│  Same flow as Dashboard scenario...                                  │
│  • Gets current state                                                │
│  • Updates pump_status                                               │
│  • Creates history record with changedBy='esp32'                     │
│  • Returns success                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Dashboard: Real-time Update (Future Enhancement)                    │
│  • Via polling: GET /api/pump-relay?mode=sawah                       │
│  • Via WebSocket: Subscribe to pump status changes                   │
│  • Current state now shows "esp32" as source in history              │
│  • User can see both manual and automated changes                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Query Performance

### Query 1: Get Current Pump Status

```sql
SELECT * FROM pump_status WHERE mode = 'sawah'
```

- **Index**: UNIQUE(mode)
- **Performance**: O(1) - constant time
- **Expected**: < 5ms

### Query 2: Get Recent History

```sql
SELECT * FROM pump_history
WHERE mode = 'sawah'
ORDER BY timestamp DESC
LIMIT 20 OFFSET 0
```

- **Index**: (mode, timestamp)
- **Performance**: O(log n + k) where k=limit
- **Expected**: < 30ms for typical dataset

### Query 3: Check State Change

```sql
SELECT previousState FROM pump_status WHERE mode = 'sawah'
```

- **Index**: UNIQUE(mode)
- **Performance**: O(1)
- **Expected**: < 5ms

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────┐
│ Request to /api/pump-relay                              │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
    ✓ Valid       ✗ Missing      ✗ DB Error
    Request      "isOn"
        │           │               │
        │           ▼               ▼
        │       Return 400      Return 500
        │       "Status must    "Failed to
        │        be filled"     update"
        │
        ▼
    Get Current
    State
        │
        ├─ State Changed ──────┬─────── Create History Record
        │                      │
        │                      ▼
        │              INSERT pump_history
        │                      │
        │                      ├─ Success ─ Return 200
        │                      │
        │                      └─ Failure ─ Return 500
        │
        └─ State Unchanged ─ Skip History ─ Return 200
```

---

## Component Dependencies

```
app/page.tsx (Dashboard)
  ├── uses: handlePumpToggle()
  ├── calls: POST /api/pump-relay
  └── displays: Current pump state (isOn)

app/profile/page.tsx (Profile)
  ├── uses: fetchPumpHistory()
  ├── calls: GET /api/pump-history
  ├── displays: Riwayat Pompa modal
  └── props: mode, limit, offset

app/api/pump-relay/route.ts
  ├── imports: prisma.pumpStatus
  ├── imports: prisma.pumpHistory
  ├── handles: POST (update), GET (query)
  └── returns: JSON response

app/api/pump-history/route.ts
  ├── imports: prisma.pumpHistory
  ├── handles: GET with pagination
  └── returns: History array + pagination info

prisma/schema.prisma
  ├── model PumpStatus
  │   ├── id, mode (UNIQUE), isOn
  │   ├── updatedAt, createdAt
  │   └── mapped to: pump_status table
  │
  └── model PumpHistory
      ├── id, mode, previousState, newState
      ├── changedBy, userId, timestamp
      ├── index: (mode, timestamp)
      └── mapped to: pump_history table
```

---

## State Management

### Frontend State (app/page.tsx)

```typescript
// Pump status in dashboard
const [sawahPumpOn, setSawahPumpOn] = useState(false)

// When toggle occurs:
1. setSawahPumpOn(checked)           // Optimistic update
2. fetch POST /api/pump-relay        // Send to server
3. On success: Keep state as-is      // Confirmed
4. On error: setSawahPumpOn(!checked) // Revert
```

### Frontend State (app/profile/page.tsx)

```typescript
// History display state
const [showPumpHistory, setShowPumpHistory] = useState(false)
const [pumpHistory, setPumpHistory] = useState<any[]>([])
const [pumpHistoryLoading, setPumpHistoryLoading] = useState(false)

// When modal opens:
1. setShowPumpHistory(true)
2. if (pumpHistory.length === 0)
3.   setPumpHistoryLoading(true)
4.   fetch GET /api/pump-history
5.   setPumpHistory(data)
6.   setPumpHistoryLoading(false)
```

### Database State

```typescript
// pump_status table (source of truth)
interface PumpStatus {
  id: string; // CUID
  mode: string; // "sawah" or "kolam"
  isOn: boolean; // Current state
  updatedAt: Date; // When changed
  createdAt: Date; // When created
}

// pump_history table (immutable log)
interface PumpHistory {
  id: string; // CUID
  mode: string; // Which pump
  previousState: boolean; // Before
  newState: boolean; // After
  changedBy: string; // "dashboard", "esp32", etc
  userId?: string; // Optional user
  timestamp: Date; // When changed
}
```

---

**Architecture is complete, tested, and production-ready!**
