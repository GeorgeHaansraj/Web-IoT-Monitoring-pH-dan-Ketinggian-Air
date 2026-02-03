# 📡 ESP32 + SIM800L IoT System - Visual Reference Guide

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            COMPLETE SYSTEM TOPOLOGY                          │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────────┐
                          │   Next.js Dashboard │
                          │  (Monitoring & UI)  │
                          └──────────┬──────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼ (GET/PUT)      │ (GET polling)  │ (GET polling)
            ┌──────────────────┐    │            ┌─────────────────┐
            │ /api/device-     │    │            │ /api/monitoring-│
            │ control (NEW!)   │    │            │ log             │
            │                  │    │            │                 │
            │ - GET: fetch     │    │            │ - Sensor data   │
            │   current command│    │            │ - Signal/Battery│
            │ - PUT: set new   │    │            │ - Water level   │
            │   command        │    │            └─────────────────┘
            └────────┬─────────┘    │
                     │              │
                     ▼              ▼
            ┌──────────────────────────────┐
            │   NeonDB (PostgreSQL)        │
            │                              │
            │ Tables:                      │
            │ - device_controls (NEW!)     │ ◄─ State persistence
            │ - monitoring_logs            │ ◄─ Sensor history
            │ - pump_status                │ ◄─ Pump feedback
            │ - water_level_readings       │
            │ - ph_readings                │
            └──────────┬───────────────────┘
                       │
                       │ (Read commands)
                       │
          ┌────────────▼──────────────┐
          │   PHP Bridge (HTTP GET)   │
          │  input-enhanced.php       │
          │                           │
          │ - Parse sensor data       │
          │ - Store to DB             │
          │ - Query command state     │
          │ - Return state to ESP32   │
          └────────────▲──────────────┘
                       │
                       │ (POST sensor + pump_status feedback)
                       │
          ┌────────────┴──────────────┐
          │   ESP32 + SIM800L (IoT)   │
          │                           │
          │ • Real-time polling       │
          │ • Sensor readings         │
          │ • Relay control           │
          │ • Status feedback         │
          └───────────────────────────┘
```

---

## Command State Machine

```
┌─────────────────────────────────────────────────────────┐
│               DEVICE CONTROL STATE MACHINE               │
└─────────────────────────────────────────────────────────┘

                          ┌───────────┐
                          │   IDLE    │ (at startup)
                          └─────┬─────┘
                                │
                    ┌───────────┴────────────┐
                    │                        │
                    ▼ (User clicks ON)       ▼ (Command: ON)
            ┌─────────────────┐      ┌──────────────────┐
            │  AWAITING RELAY │      │  RELAY ENERGIZED │
            │                 │      │  (pump running)  │
            │ DB: command="ON"│◄─────│  isOn=true       │
            │ ESP: pending    │      └──────────────────┘
            │                 │               ▲
            └────────┬────────┘               │
                     │                        │
                     │ (20-30s polling)       │
                     ▼                        │
            ┌─────────────────┐               │
            │  EXECUTING      │               │
            │                 │       feedback│
            │ • GPIO HIGH     │               │
            │ • pump_status   │───────────────┘
            │   becomes true  │
            └────────┬────────┘
                     │
                     │ (next poll)
                     ▼
            ┌─────────────────┐
            │   RUNNING       │
            │                 │
            │ • pump_status=T │
            │ • monitoring    │
            │   normal        │
            └────────┬────────┘
                     │
                     │ (User clicks OFF or 2h passed)
                     ▼
            ┌─────────────────┐
            │   STOPPING      │
            │                 │
            │ • GPIO LOW      │
            │ • pump_status=F │
            └────────┬────────┘
                     │
                     ▼
            ┌─────────────────┐
            │   IDLE (OFF)    │
            │                 │
            │ DB: command="OFF"
            │ ESP: acknowledged
            └─────────────────┘
```

---

## Data Flow Sequence Diagram

```
Timeline: ESP32 cycles every 20 seconds

TIME: T=0s
┌──────────────────────────────────────────────────────────────┐
│ USER CLICKS "ON" BUTTON ON DASHBOARD                         │
└──────────────────────────────────────────────────────────────┘
          │
          ▼ HTTP PUT
   Next.js Backend
          │
          ▼ UPDATE SQL
   NeonDB device_controls
   { command: "ON", updated_at: T=0s }


TIME: T=5s (Dashboard polling)
┌──────────────────────────────────────────────────────────────┐
│ DASHBOARD: GET /api/device-control?mode=sawah              │
│ Response: { command: "ON", age_seconds: 5 }                │
│ UI: "Command sent ✓ | Waiting for feedback..."             │
└──────────────────────────────────────────────────────────────┘


TIME: T=20s (ESP32 polling)
┌──────────────────────────────────────────────────────────────┐
│ ESP32: Read sensors                                          │
│ • pH: 6.5                                                    │
│ • Battery: 85%                                               │
│ • Signal: 28/31                                              │
│ • Water Level: 45.2 cm                                       │
│ • pump_status: false (current GPIO state)                    │
└──────────────────────────────────────────────────────────────┘
          │
          ▼ HTTP POST JSON
   PHP Bridge: input-enhanced.php
          │
          ├─ INSERT monitoring_logs (sensor data)
          │
          ├─ UPDATE pump_status (feedback: false)
          │
          ├─ SELECT device_controls WHERE mode='sawah'
          │  Result: { command: "ON", updated_at: T=0s }
          │
          ├─ CHECK EXPIRY: 20s < 7200s ✓ VALID
          │
          └─ RESPOND: { command: "ON", device_id: "...", ... }
                        │
                        ▼
                   ESP32: Parse JSON
                        │
                        ├─ if (command == "ON")
                        │     digitalWrite(PIN_RELAY1, HIGH)
                        │     Serial: "[RELAY] ON"
                        │
                        └─ Wait 20 seconds for next poll


TIME: T=25s (Dashboard polling)
┌──────────────────────────────────────────────────────────────┐
│ DASHBOARD: GET /api/device-control?mode=sawah              │
│ Response: { command: "ON", age_seconds: 25 }               │
│ UI: Still "Waiting for feedback..."                        │
└──────────────────────────────────────────────────────────────┘


TIME: T=40s (ESP32 polling - 2nd cycle)
┌──────────────────────────────────────────────────────────────┐
│ ESP32: Read sensors + RELAY STATE (GPIO)                     │
│ • pH: 6.5                                                    │
│ • Battery: 84%                                               │
│ • Signal: 29/31                                              │
│ • pump_status: TRUE ⭐ (relay is now ON!)                     │
└──────────────────────────────────────────────────────────────┘
          │
          ▼ HTTP POST JSON (with pump_status: true)
   PHP Bridge
          │
          ├─ INSERT monitoring_logs
          │
          ├─ UPDATE pump_status SET is_on=true
          │
          └─ RESPOND: { command: "ON", ... }
                        │
                        ▼
                   ESP32: Relay stays ON


TIME: T=45s (Dashboard polling)
┌──────────────────────────────────────────────────────────────┐
│ DASHBOARD: GET /api/device-control?mode=sawah              │
│ Response: { command: "ON", age_seconds: 45 }               │
│ Gets latest monitoring_logs with pump_status: true          │
│ UI: "POMPA NYALA ✅ | Signal: 29/31 | Battery: 84%"         │
└──────────────────────────────────────────────────────────────┘


TIME: T=120s (User clicks OFF)
┌──────────────────────────────────────────────────────────────┐
│ USER CLICKS "OFF" BUTTON ON DASHBOARD                        │
│ [Repeat flow: PUT → DB → ESP polling → RELAY OFF]           │
└──────────────────────────────────────────────────────────────┘
```

---

## Multi-Device Command Priority

```
┌──────────────────────────────────────────────────────────────┐
│        COMMAND LOOKUP HIERARCHY (Fallback Logic)             │
└──────────────────────────────────────────────────────────────┘

Database state:
┌─────────────────────────────────────────────────────────────┐
│ device_controls table:                                       │
├──────┬────────────────┬────────┬─────────┬─────────────────┤
│ id   │ deviceId       │ mode   │ command │ updated_at      │
├──────┼────────────────┼────────┼─────────┼─────────────────┤
│ 1    │ ESP32-KKN-01   │ sawah  │ ON      │ 2025-02-01 10:00│ ◄─ PRIORITY 1
│ 2    │ ESP32-KKN-02   │ kolam  │ OFF     │ 2025-02-01 09:45│
│ 3    │ NULL           │ sawah  │ OFF     │ 2025-02-01 08:30│ ◄─ PRIORITY 2
└─────────────────────────────────────────────────────────────┘

Query Scenarios:

SCENARIO 1: ESP32-KKN-01 polling (mode=sawah)
─────────────────────────────────────────────────
Step 1: SELECT WHERE deviceId='ESP32-KKN-01' AND mode='sawah'
        Result: FOUND { command: "ON" }
        ✓ Use this (Device-specific command)


SCENARIO 2: ESP32-KKN-03 polling (mode=sawah)
──────────────────────────────────────────────
Step 1: SELECT WHERE deviceId='ESP32-KKN-03' AND mode='sawah'
        Result: NOT FOUND
Step 2: SELECT WHERE deviceId=NULL AND mode='sawah'
        Result: FOUND { command: "OFF" }
        ✓ Use this (Global fallback)


SCENARIO 3: Brand new ESP32 (unknown device)
─────────────────────────────────────────────
Step 1: SELECT WHERE deviceId='ESP32-NEW' AND mode=any
        Result: NOT FOUND
Step 2: SELECT WHERE deviceId=NULL AND mode=any
        Result: NOT FOUND
        ✓ Use default: "OFF" (Safety)


SCENARIO 4: Command too old (>2 hours)
───────────────────────────────────────
Step 1: SELECT ... (found OK)
Step 2: age_seconds = NOW() - updated_at
        If age_seconds > 7200: EXPIRED!
        ✓ Force: "OFF" (Safety measure)
```

---

## API Endpoints Summary

```
┌────────────────────────────────────────────────────────────────┐
│                    REST API ENDPOINTS                          │
└────────────────────────────────────────────────────────────────┘

ENDPOINT 1: /api/device-control (NEW!)
────────────────────────────────────

GET /api/device-control?mode=sawah&device_id=ESP32-KKN-01
────────────────────────────────────────────────────────────
Purpose: Fetch current command state
Status: 200 OK
Response:
{
  "success": true,
  "command": "ON",              ◄─ Main data
  "mode": "sawah",
  "device_id": "ESP32-KKN-01",
  "updated_at": "2025-02-01T12:30:00Z",
  "age_seconds": 45,            ◄─ How old is command?
  "is_expired": false           ◄─ Still valid?
}

Use case: Dashboard polling every 5s
Frequency: Non-blocking, safe for frequent calls


PUT /api/device-control
─────────────────────────
Purpose: Update command state
Auth: Required (NextAuth session)
Request Body:
{
  "command": "ON",              ◄─ "ON" or "OFF"
  "mode": "sawah",              ◄─ "sawah" or "kolam"
  "device_id": "ESP32-KKN-01",  ◄─ Optional (null for global)
  "reason": "User clicked ON"   ◄─ Optional (audit trail)
}

Response: 200 OK
{
  "success": true,
  "command": "ON",
  "mode": "sawah",
  "updated_at": "2025-02-01T12:35:00Z"
}

Use case: User clicks ON/OFF button on dashboard
Frequency: On demand (1-5 times per minute max)


ENDPOINT 2: /api/pump-relay (EXISTING - unchanged)
───────────────────────────────────────────────────

GET /api/pump-relay?mode=sawah
──────────────────────────────
Response includes: pump state + duration + manual mode
(Already working, fully compatible with new system)

POST /api/pump-relay
────────────────────
Accepts: command + mode + duration + manual_mode
(Already working, no changes needed)


ENDPOINT 3: /api/monitoring-log (EXISTING - enhanced)
──────────────────────────────────────────────────────

GET /api/monitoring-log
────────────────────────
Now includes:
✓ signal_strength (CSQ 0-31)
✓ pump_status feedback
✓ Real battery percentage
✓ Water level data
(All from ESP32 real readings)
```

---

## Hardware Wiring Checklist

```
ESP32 DEVKIT V1 PINOUT
──────────────────────

                   ┌─────────────────────────┐
                   │   ESP32 DEVKIT V1       │
              ┌────┤                         ├────┐
              │    │                         │    │
         GND  │    │ GND         3V3         │    │ 3V3
         GND  │    │ GND         EN          │    │ EN
              │    │ D35         CLK         │    │
         D23  │    │ D32         MOSI        │    │ D33
         D22  │    │ D14         MISO        │    │ D25
         TX2  │    │ D27 [TXG]   D26 [RXG]  │    │ RX2
         RX2  │    │ D25         D12         │    │ D13
              │    │ D4          GND         │    │
              │    │ D2          D15         │    │
         D26  │    │ D34◄────────┐           │    │
         D19  │    │ D35         │ BATTERY   │    │
         D18  │    │ GND         │ VOLTAGE   │    │
         D5   │    │ D19◄────────┤           │    │
         D17  │    │ D23         │ (via R1)  │    │
         D16  │    │ D18         │           │    │
              │    │ GND         GND◄────────┘    │
              │    │             3V3◄─────┐       │
         D4   │    │ D5                   │       │
              │    │                      │       │
              └────┤                      ├───────┘
                   └─────────────────────────┘

CONNECTIONS:
────────────

1. SIM800L GSM Module
   ├─ RX (ESP32)    ← TX (SIM800L)
   ├─ TX (ESP32)    → RX (SIM800L)
   ├─ GND (ESP32)   ← GND (SIM800L)
   └─ 5V (PSU)      ← VBAT (SIM800L) [use separate 2A PSU!]

2. Voltage Divider (for Battery)
   ├─ Batt + (3.7-4.2V Li-ion)
   │  │
   │  R1 (30kΩ)
   │  │
   ├─ D34 (ESP32 ADC pin)
   │  │
   │  R2 (7.5kΩ)
   │  │
   ├─ GND

   Voltage formula:
   V_BAT = (ADC_READ / 4095) * 3.3 * (R1+R2)/R2
          = (ADC_READ / 4095) * 3.3 * 5.0

3. Relay Modules
   ├─ RELAY 1 (Main)  → D4
   ├─ RELAY 2 (Pump)  → D18
   ├─ GND             → GND
   └─ VCC             → 5V

4. Sensors
   ├─ pH Sensor       → D36 (ADC)
   ├─ Ultrasonic TRIG → D5
   ├─ Ultrasonic ECHO → D19
   └─ Water Level     → GND + D19 shared

5. Buttons (optional)
   ├─ BTN_SAWAH       → D32
   ├─ BTN_KOLAM       → D25
   └─ All ground      → GND
```

---

## Troubleshooting Decision Tree

```
┌────────────────────────────────────────────────────────────┐
│        ISSUE RESOLUTION DECISION TREE                      │
└────────────────────────────────────────────────────────────┘

START: "System not working"
│
├─ Serial Monitor shows error?
│  │
│  ├─ YES: "Modem tidak merespon!"
│  │       → Check: Power supply (2A), TX/RX cables
│  │       → Try: Reset modem (RST pin LOW 200ms)
│  │
│  ├─ YES: "No Signal!"
│  │       → Check: SIM card inserted, antenna connected
│  │       → Wait: 30-60 seconds for signal
│  │       → Try: Different location (near window)
│  │
│  └─ NO: Continue...
│
├─ GPRS Connected but no data?
│  │
│  ├─ Check: ESP32 → PHP Bridge connection
│  │   curl -v http://[PHP_SERVER]/api/input-enhanced.php
│  │
│  ├─ Check: Database → Check NeonDB monitoring_logs
│  │   SELECT * FROM monitoring_logs ORDER BY created_at DESC;
│  │
│  └─ If empty: Bridge not inserting data
│       → Debug: PHP error logs
│       → Fix: Database connection in PHP
│
├─ Data in DB but command not received?
│  │
│  ├─ Check: device_controls table
│  │   SELECT * FROM device_controls WHERE mode='sawah';
│  │
│  ├─ If empty: Dashboard not updating commands
│  │    → Check: Dashboard user authenticated
│  │    → Check: PUT /api/device-control returns 200
│  │
│  └─ If exists but old (>2h): Command expired!
│       → Check: is_expired flag
│       → Fix: Send new command
│
├─ Relay not executing command?
│  │
│  ├─ Check: ESP32 JSON parsing
│  │   Serial.println(response); // debug
│  │
│  ├─ Check: Relay GPIO pin
│  │   digitalWrite(PIN_RELAY, HIGH);
│  │   delay(1000);
│  │   Serial.println(digitalRead(PIN_RELAY)); // should be 1
│  │
│  └─ If stuck: Hardware issue
│       → Test: Relay with direct GPIO toggle
│       → Replace: Relay module if needed
│
└─ End: Issue resolved ✓
```

---

## Performance Monitoring

```
┌──────────────────────────────────────────────────────────────┐
│           KEY METRICS TO MONITOR (Production)                │
└──────────────────────────────────────────────────────────────┘

METRIC 1: Signal Quality (CSQ)
────────────────────────────────
Threshold: 0-31 (higher = better)
Good:      25+ (90%+ success rate)
Acceptable: 15-24 (70-90% success rate)
Poor:      0-14 (unreliable)
Check:     Every ESP poll

Action:
- If < 15: Relocate antenna, wait for signal
- If stuck at 99: SIM card issue


METRIC 2: Battery Level
──────────────────────────
Threshold: 0-100%
Good:      > 70%
Warning:   30-70%
Critical:  < 30%
Check:     Every ESP poll

Action:
- If < 30%: Charge immediately
- If erratic: Check voltage divider resistors


METRIC 3: Command Latency
───────────────────────────
Threshold: Time from dashboard PUT to relay execution
Target:    < 50 seconds (4 polls @ 20s + margin)
Acceptable: < 120 seconds
Poor:      > 120 seconds

Expected breakdown:
- Dashboard PUT: 1s
- DB write: 1s
- ESP polling delay: 0-20s
- HTTP request: 2s
- GPIO execution: 0.1s
Total: 4-25 seconds (most of the time)


METRIC 4: Data Freshness
──────────────────────────
Last sensor reading: Should be < 25 seconds old
Alert if: > 60 seconds old (network issue)

Dashboard shows: "Last update: Xs ago"


METRIC 5: API Response Time
─────────────────────────────
GET /api/device-control: Should be < 100ms
PUT /api/device-control: Should be < 500ms
POST bridge: Should be < 2 seconds


METRIC 6: Database Performance
────────────────────────────────
monitoring_logs inserts: > 95% success
device_controls updates: 100% success (critical)
Query response: < 100ms


┌──────────────────────────────────────────────────────────┐
│ Healthy System Dashboard Status:                          │
├──────────────────────────────────────────────────────────┤
│ Signal:     ████████░░ 28/31 (Good)                     │
│ Battery:    ██████░░░░ 85% (Good)                       │
│ Last Poll:  Just now (5s ago)                           │
│ Commands:   8 today (all executed successfully)         │
│ Uptime:     23d 14h 32m                                 │
│ Data Used:  ~42 MB / 1000 MB (monthly plan)             │
└──────────────────────────────────────────────────────────┘
```

---

**Version:** 1.0  
**Last Updated:** February 2, 2025  
**Status:** ✅ Production Ready  
**Build Status:** ✅ All Tests Pass
