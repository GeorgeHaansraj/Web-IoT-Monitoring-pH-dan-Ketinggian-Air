# Pump Control Multi-User Synchronization ✅

## Overview
Sistem kontrol pompa yang terintegrasi penuh dengan sync real-time antar semua user/akun. Setiap akun (user/admin) melihat status pompa yang sama di database.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│           Multiple Users/Accounts                        │
│  (User A) | (User B) | (User C) | (Admin) | etc...      │
└────────────────┬──────────────────────┬─────────────────┘
                 │                      │
           5s polling    ←→    5s polling
                 │                      │
         ┌───────▼──────────────────────▼────────┐
         │   Single Database (PumpStatus)        │
         │   - isOn (boolean)                    │
         │   - isManualMode (boolean)            │
         │   - pumpDuration (hours)              │
         │   - pumpStartTime (datetime)          │
         │   - lastChangedBy (user/auto)         │
         └───────┬──────────────────────┬────────┘
                 │                      │
         ┌───────▼──────────────────────▼────────┐
         │   Hardware Controller                 │
         │   - ESP32/Bridge                      │
         │   - Actual Relay Control              │
         └───────────────────────────────────────┘
```

## Pump Control Modes

### 1. Timed Mode (1h, 2h, 3h)
**Behavior**: Auto-OFF setelah duration expire

**When User A turns ON pump (2 hours)**:
- Database: `isOn=true, isManualMode=false, pumpDuration=2, pumpStartTime=now()`
- Hardware: Relay turns ON
- User B sees: Pump ON (via 5s polling) ✅
- Admin sees: Pump ON (via 5s polling) ✅

**After 2 hours**:
- User A logout/page leave: Pump tetap ON (tidak di-OFF)
- User B polling: Detect duration expired → auto-OFF
- All users see: Pump OFF (next polling cycle, max 5s)
- History: recorded with `changedBy="auto-duration"`

### 2. Manual Mode
**Behavior**: Indefinite ON sampai user OFF atau logout/page leave

**When User A turns ON pump (manual)**:
- Database: `isOn=true, isManualMode=true, pumpDuration=null`
- Hardware: Relay turns ON
- User B sees: Pump ON (via 5s polling) ✅
- Admin sees: Pump ON (via 5s polling) ✅

**When User A logs out**:
- handleLogout() checks: isPumpOn && isManualMode?
- If YES → POST to OFF pump sebelum signOut()
- All users see: Pump OFF (next polling, max 5s)
- History: recorded with `changedBy="auto-logout"`

**When User B navigates away**:
- beforeunload listener triggers
- Fetch current pump status
- If isManualMode=true → OFF pump (keepalive)
- All users see: Pump OFF (next polling, max 5s)
- History: recorded with `changedBy="auto-page-leave"`

## Key Synchronization Features

### ✅ Real-time Polling (Every 5 seconds)
All dashboards poll `/api/pump-relay?mode=sawah` every 5s:
```typescript
const pollInterval = setInterval(pollPumpStatus, 5000); // 5 seconds
```

**Updates**:
- `isPumpOn` state
- `isManualMode` state
- Detects auto-OFF by duration
- Syncs changes from other users

### ✅ Auto-OFF Duration Logic (GET Handler)
```typescript
// GET /api/pump-relay
if (pumpStatus.isOn && !pumpStatus.isManualMode && pumpStatus.pumpStartTime) {
  const elapsed = (Date.now() - pumpStatus.pumpStartTime) / (1000 * 60 * 60);
  if (elapsed > pumpStatus.pumpDuration) {
    // Auto-OFF: Database updated
    // Next polling cycle (max 5s): All users see OFF
  }
}
```

### ✅ Manual Mode Logout Auto-OFF (Logout Handler)
```typescript
const handleLogout = async () => {
  // BEFORE signOut(), check if manual mode
  if (isPumpOn && isManualMode) {
    // POST to OFF pump
    // Wait 100ms
    // Then signOut()
  }
};
```

### ✅ Manual Mode Page Leave Auto-OFF (beforeunload)
```typescript
window.addEventListener("beforeunload", async () => {
  if (pumpStatus.isManualMode === true) {
    // POST to OFF pump (keepalive)
  }
});
```

### ✅ 24-Hour Safety Timeout
```typescript
// POST handler checks
if (hoursSinceUpdate > 24) {
  // Auto-OFF regardless of mode
  // changedBy = "auto-timeout"
}
```

## Consistency Between Dashboards

Both user and admin dashboards have identical pump control logic:

| Feature | User Dashboard | Admin Dashboard |
|---------|---|---|
| Polling interval | 5s ✅ | 5s ✅ |
| Duration modal | Yes ✅ | Yes ✅ |
| Manual mode OFF on logout | Yes ✅ | Yes ✅ |
| beforeunload listener | Yes ✅ | Yes ✅ |
| Tracks `isManualMode` | Yes ✅ | Yes ✅ |
| Sessions validation | Yes ✅ | Yes ✅ |
| Heartbeat check (ON) | Yes ✅ | Yes ✅ |

## Test Scenarios

### Scenario 1: Timed Mode (1h) + Logout
```
1. User A: Turn ON pump (select "1 Jam")
   → DB: isOn=true, isManualMode=false, pumpDuration=1
2. User B sees: Pump ON ✅ (within 5s)
3. User A logout
   → handleLogout checks: isPumpOn && isManualMode?
   → NO (isManualMode=false) → NO auto-OFF
   → Pump stays ON
4. User B sees: Pump ON ✅ (still ON)
5. After 1 hour:
   → Any polling (User A, B, C, Admin)
   → GET handler detects: elapsed > duration
   → Auto-OFF triggered
6. All users see: Pump OFF ✅ (within 5s)
```

### Scenario 2: Timed Mode (2h) + Page Leave
```
1. User A: Turn ON pump (select "2 Jam")
   → DB: isOn=true, isManualMode=false, pumpDuration=2
2. User B, Admin see: Pump ON ✅
3. User A navigate to different page
   → beforeunload fires
   → Check isManualMode? NO → do nothing
   → Pump stays ON
4. All users: Pump still ON ✅
5. After 2 hours: Auto-OFF by duration
6. All users see: Pump OFF ✅
```

### Scenario 3: Manual Mode + Logout
```
1. User A: Turn ON pump (select "Manual")
   → DB: isOn=true, isManualMode=true, pumpDuration=null
2. User B, C, Admin see: Pump ON ✅
3. User A logout
   → handleLogout checks: isPumpOn && isManualMode?
   → YES → POST to OFF pump
   → signOut()
4. All users see: Pump OFF ✅ (within 5s)
5. History: changedBy="auto-logout"
```

### Scenario 4: Manual Mode + Page Leave
```
1. User A: Turn ON pump (select "Manual")
2. User B, Admin see: Pump ON ✅
3. User A navigate away (different page, window close, etc)
   → beforeunload fires
   → Fetch pump status
   → Check isManualMode? YES
   → POST to OFF pump (keepalive)
4. All users see: Pump OFF ✅ (within 5s)
5. History: changedBy="auto-page-leave"
```

### Scenario 5: Multiple Users Scenario
```
1. User A: Turn ON pump (Manual)
   → DB: isOn=true, isManualMode=true
   
2. User B: Sees pump ON ✅ (polling)
   User C: Sees pump ON ✅ (polling)
   Admin: Sees pump ON ✅ (polling)

3. User C: Try to turn OFF
   → POST /api/pump-relay {isOn: false}
   → DB updated: isOn=false
   → User A: See OFF ✅ (polling)
   → User B: See OFF ✅ (polling)
   → Admin: See OFF ✅ (polling)

4. User A: Turn ON (2h timed mode)
   → DB: isOn=true, isManualMode=false, pumpDuration=2
   → All users: See ON ✅

5. User B: Turn OFF
   → All users: See OFF ✅
   → History: changedBy="User B" (if tracked)
```

## Database Schema

```prisma
model PumpStatus {
  id            String   @id @default(cuid())
  mode          String   @unique // "sawah" or "kolam"
  isOn          Boolean  @default(false)
  updatedAt     DateTime @updatedAt
  createdAt     DateTime @default(now())
  
  // Duration tracking for timed/manual modes
  pumpDuration  Int?      // Hours (null for manual or OFF)
  pumpStartTime DateTime? // When pump turned ON
  isManualMode  Boolean   @default(false)
  
  @@map("pump_status")
}

model PumpHistory {
  id           String   @id @default(cuid())
  mode         String
  previousState Boolean
  newState     Boolean
  changedBy    String   // "dashboard", "User A", "auto-logout", "auto-page-leave", "auto-duration"
  userId       String?
  timestamp    DateTime @default(now())
}
```

## Polling Strategy

### Why 5 seconds?
- **Fast enough**: Most users see changes within 5s
- **Not too aggressive**: Reduces server load
- **UI responsive**: Feels real-time for user experience
- **Auto-OFF detection**: Duration-expired detected quickly

### Multi-user sync flow:
```
User A ON  →  Database  ←  5s poll
(T=0s)        updated       (T=0-5s)
                             User B sees
                             User C sees
                             Admin sees
```

## API Endpoints

### GET /api/pump-relay?mode=sawah
**Returns**:
```json
{
  "mode": "sawah",
  "isOn": true,
  "isManualMode": false,
  "pumpDuration": 2,
  "pumpStartTime": "2026-02-02T10:30:00Z",
  "updatedAt": "2026-02-02T10:30:15Z"
}
```

**Auto-OFF check**: If timed mode and duration expired → updates DB and returns `isOn: false`

### POST /api/pump-relay
**Body**:
```json
{
  "mode": "sawah",
  "isOn": true,
  "duration": 2,
  "isManualMode": false,
  "changedBy": "dashboard"
}
```

**Database updates**:
- If `isOn=true`: saves `duration`, `isManualMode`, `pumpStartTime`
- If `isOn=false`: clears duration fields

## Security Features

✅ **Session validation**: Must be authenticated to control pump
✅ **Heartbeat check**: Session verified when turning ON
✅ **24-hour timeout**: Auto-OFF after 24 hours regardless of mode
✅ **User tracking**: Each action recorded with userId and username
✅ **Authorization**: All authenticated users can control pump

## Commits

- `9061610`: Reduce polling from 10s to 5s
- `a79f914`: Add manual mode auto-OFF on logout
- `35acd94`: Add pump duration modal UI
- `335f180`: API duration control + auto-OFF logic

## Status

✅ **Timed Mode**: Works correctly
- Auto-OFF after duration (1h, 2h, 3h)
- NOT OFF on logout
- NOT OFF on page leave
- All users see consistent state

✅ **Manual Mode**: Works correctly
- Indefinite ON
- Auto-OFF on logout
- Auto-OFF on page leave
- All users see consistent state

✅ **Multi-user Sync**: Working
- 5s polling for all users
- Real-time updates across dashboards
- Consistent database state

✅ **Safety**: All implemented
- Session validation
- Heartbeat check
- 24-hour timeout
- User tracking
