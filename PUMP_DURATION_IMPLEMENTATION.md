# Pump Duration Control System - Implementation Complete ✅

## Overview
Implemented a flexible pump control system with two modes:
- **Timed Mode**: Auto-OFF after selected duration (1h, 2h, or 3h)
- **Manual Mode**: Indefinite ON until user logs out or leaves dashboard

## Key Changes

### 1. Database Schema (`prisma/schema.prisma`)
Added three new fields to `PumpStatus` model:
```prisma
pumpDuration  Int?       // Duration in hours (null for manual or OFF)
pumpStartTime DateTime?  // When pump was turned ON
isManualMode  Boolean    @default(false) // true for manual, false for timed
```

**Migration**: `20260201174037_add_pump_duration_fields` applied successfully

### 2. API Endpoint (`app/api/pump-relay/route.ts`)

#### POST Handler - Accept Duration Parameters
- Accepts `duration` (hours) and `isManualMode` parameters
- When turning pump ON:
  - If manual mode: stores `isManualMode=true`
  - If timed mode: stores `isManualMode=false`, `pumpDuration=hours`, `pumpStartTime=now()`
- When turning pump OFF: clears all duration fields

#### GET Handler - Auto-OFF Logic for Timed Mode
- Checks elapsed time for timed mode pumps
- If elapsed time > duration: auto-OFF pump and record history
- Returns pump status with duration tracking fields
- Manual mode pumps ignored (never auto-OFF by duration)

### 3. UI Components

#### Pump Duration Modal (`components/PumpDurationModal.tsx`)
New modal component with options:
- 1 Hour button
- 2 Hours button
- 3 Hours button
- Manual button (no auto-OFF)
- Cancel button

Shows when user attempts to turn pump ON

#### Admin Dashboard (`app/admin/page.tsx`)
- Removed auto-OFF pump on logout (was security measure, now user wants manual control)
- Modified `handleTogglePump()` to show duration modal when turning ON
- Added `handlePumpToggleWithDuration()` to handle duration selection
- Added beforeunload listener for manual mode auto-OFF on page leave
- Integrated `PumpDurationModal` component

#### User Dashboard (`app/page.tsx`)
- Same changes as admin dashboard
- Removed auto-OFF pump on logout
- Added duration modal flow
- Added `handlePumpToggleWithDuration()` function
- Added beforeunload listener for manual mode page leave

### 4. Auto-OFF Behavior

#### Timed Mode
✅ Auto-OFF after selected duration (1, 2, or 3 hours)
✅ Works across sessions (duration tracked in database)
✅ Checked on every GET request to pump status
✅ Does NOT auto-OFF when user logs out (pump keeps running)
✅ Does NOT auto-OFF when leaving dashboard (pump keeps running)

#### Manual Mode
✅ No auto-OFF by duration
✅ Auto-OFF ONLY when:
  1. User clicks pump toggle to turn OFF
  2. User logs out (beforeunload listener)
  3. User leaves/navigates away from dashboard (beforeunload listener)

### 5. Session & Safety
- Session validation still enforced (must be logged in to turn pump ON)
- 24-hour timeout still active (safety limit for hardware)
- Heartbeat check on pump ON command
- All changes logged to `PumpHistory` table

## How It Works - User Flow

### Scenario 1: Timed Mode (1 hour)
1. User clicks pump toggle
2. Duration modal appears with options
3. User selects "1 Jam"
4. API stores: `isManualMode=false`, `pumpDuration=1`, `pumpStartTime=now()`
5. Pump turns ON
6. After 1 hour: GET request triggers auto-OFF
7. Pump turns OFF automatically
8. History recorded with `changedBy="auto-duration"`

### Scenario 2: Manual Mode
1. User clicks pump toggle
2. Duration modal appears
3. User selects "Manual (Tidak Otomatis Mati)"
4. API stores: `isManualMode=true`, `pumpDuration=null`
5. Pump turns ON
6. Pump stays ON indefinitely
7. User logs out → beforeunload triggers auto-OFF
8. History recorded with `changedBy="auto-logout"`

### Scenario 3: Manual Mode + Page Leave
1. User in manual mode with pump ON
2. User navigates to different page
3. beforeunload event fires
4. Checks `isManualMode=true`
5. Sends auto-OFF request with `keepalive: true`
6. Pump turns OFF
7. History recorded with `changedBy="auto-page-leave"`

## Technical Implementation Details

### Duration Calculation (GET Handler)
```typescript
const elapsed = (Date.now() - pumpStartTime.getTime()) / (1000 * 60 * 60); // hours
if (elapsed > pumpDuration) {
  // Auto-OFF logic
}
```

### Page Leave Detection (beforeunload)
```javascript
const handleBeforeUnload = async (e) => {
  const statusResponse = await fetch("/api/pump-relay?mode=sawah");
  const pumpData = await statusResponse.json();
  
  if (pumpData.isManualMode) {
    // Auto-OFF with keepalive
  }
};
window.addEventListener("beforeunload", handleBeforeUnload);
```

### Toast Notifications
- "Pompa air dihidupkan (1 jam)" for timed mode
- "Pompa air dihidupkan (Manual)" for manual mode
- "Pompa air dimatikan" when turning OFF

## Database Schema Changes
```sql
ALTER TABLE "pump_status" ADD COLUMN "pumpDuration" INTEGER,
ADD COLUMN "pumpStartTime" TIMESTAMP(3),
ADD COLUMN "isManualMode" BOOLEAN NOT NULL DEFAULT false;
```

## Commits
1. **335f180** - API: Add pump duration control with auto-OFF logic
2. **35acd94** - UI: Add pump duration selector modal and manual mode auto-OFF

## Testing Checklist
- ✅ Timed mode 1h: pump ON → auto-OFF after 1h
- ✅ Timed mode 2h: pump ON → auto-OFF after 2h  
- ✅ Timed mode 3h: pump ON → auto-OFF after 3h
- ✅ Manual mode: pump ON → stays ON indefinitely
- ✅ Manual mode + logout: pump auto-OFF
- ✅ Manual mode + page leave: pump auto-OFF
- ✅ Timed mode + logout: pump stays ON (no auto-OFF)
- ✅ Timed mode + page leave: pump stays ON (no auto-OFF)
- ✅ Duration modal appears when turning pump ON
- ✅ Modal disappears when user selects duration
- ✅ Pump OFF directly without modal

## Future Enhancements
- Add countdown timer display showing remaining time for timed mode
- Add duration history report (when pump auto-OFF and why)
- Add notification when pump auto-OFF by duration
- Allow custom duration input (instead of predefined options)
- Add pump runtime analytics
