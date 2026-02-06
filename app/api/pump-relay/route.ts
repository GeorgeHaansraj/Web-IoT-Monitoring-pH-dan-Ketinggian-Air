import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Konfigurasi Bridge PHP
const BRIDGE_URL = process.env.BRIDGE_PHP_URL || "http://20.2.138.40";
const PUMP_MODE = "PUMP"; // ESP32 convention: mode is always "PUMP"

/**
 * Trigger kontrol relay ke PHP Bridge
 * Bridge kemudian akan forward ke ESP32 via MQTT/Serial
 */
async function triggerBridgeRelay(mode: string, state: boolean) {
  try {
    const controlEndpoint = `${BRIDGE_URL}/control.php`;

    console.log(`[BRIDGE] Mengirim perintah ke ${controlEndpoint}`);
    console.log(`[BRIDGE] Mode: ${mode}, State: ${state ? "ON" : "OFF"}`);

    const formData = new URLSearchParams();
    formData.append("action", "set_pump");
    formData.append("mode", mode);
    formData.append("state", state ? "1" : "0");

    const response = await fetch(controlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(`Bridge returned ${response.status}`);
    }

    const data = await response.text();
    console.log(`[BRIDGE] Response: ${data}`);
    return true;
  } catch (error) {
    console.error("[BRIDGE] Gagal mengirim kontrol relay:", error);
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "sawah";

    // Ambil status command dari DeviceControls (ESP32 convention)
    const deviceControl = await prisma.deviceControl.findUnique({
      where: {
        deviceId_mode: {
          deviceId: mode, // "sawah" or "kolam"
          mode: PUMP_MODE, // Always "PUMP"
        },
      },
    });

    // Ambil timer info dari PumpTimer
    const pumpTimer = await prisma.pumpTimer.findUnique({
      where: { mode: mode },
    });

    // Default values jika data tidak ditemukan
    let isOn = false;
    let isManualMode = true;
    let pumpDuration = null;
    let pumpStartTime = null;

    if (deviceControl) {
      isOn = deviceControl.command === "ON";
    }

    if (pumpTimer) {
      isManualMode = pumpTimer.isManualMode;
      pumpDuration = pumpTimer.duration;
      pumpStartTime = pumpTimer.startTime;
    }

    // AUTO-OFF Logic: Cek apakah timer sudah habis
    if (
      isOn &&
      !isManualMode &&
      pumpStartTime &&
      pumpDuration
    ) {
      const elapsed = (Date.now() - pumpStartTime.getTime()) / (1000 * 60 * 60); // dalam jam

      if (elapsed > pumpDuration) {
        console.log(
          `[PUMP] Auto-OFF timer expired for ${mode} (elapsed: ${elapsed.toFixed(2)}h, duration: ${pumpDuration}h)`
        );

        // Update DeviceControls ke OFF
        await prisma.deviceControl.update({
          where: {
            deviceId_mode: {
              deviceId: mode,
              mode: PUMP_MODE,
            },
          },
          data: {
            command: "OFF",
            updatedAt: new Date(),
          },
        });

        // Reset PumpTimer
        await prisma.pumpTimer.update({
          where: { mode },
          data: {
            duration: null,
            startTime: null,
            isManualMode: false,
          },
        });

        // Record history
        await prisma.pumpHistory.create({
          data: {
            mode,
            previousState: true,
            newState: false,
            changedBy: "auto-duration",
            userId: null,
            timestamp: new Date(),
          },
        });

        // Trigger hardware OFF
        await triggerBridgeRelay(mode, false);

        // Update status untuk response
        isOn = false;
        pumpDuration = null;
        pumpStartTime = null;
      }
    }

    return NextResponse.json({
      mode: mode,
      isOn: isOn,
      updatedAt: deviceControl?.updatedAt || new Date(),
      isManualMode: isManualMode,
      pumpDuration: pumpDuration,
      pumpStartTime: pumpStartTime,
    });
  } catch (error) {
    console.error("Error fetching pump status:", error);
    return NextResponse.json(
      { error: "Failed to fetch pump status" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get user session untuk tracking siapa yang mengontrol
    const session = await auth();

    // SECURITY: Validate session exists and is active
    if (!session || !session.user) {
      return NextResponse.json(
        {
          error:
            "Session tidak valid atau sudah expired. Silakan login kembali.",
        },
        { status: 401 },
      );
    }

    const userId = (session.user as { id?: string }).id;

    const body = await req.json();
    const {
      mode = "sawah",
      isOn,
      changedBy = "dashboard",
      duration = null,
      isManualMode = false,
    } = body;

    if (isOn === undefined) {
      return NextResponse.json(
        { error: "Status pompa harus diisi (true/false)" },
        { status: 400 },
      );
    }

    // SECURITY: If turning ON, verify session is valid (heartbeat check)
    if (isOn) {
      if (!session || !session.user) {
        return NextResponse.json(
          { error: "Session invalid - cannot turn pump ON" },
          { status: 401 },
        );
      }
    }

    // Get current status untuk riwayat comparison
    const currentControl = await prisma.deviceControl.findUnique({
      where: {
        deviceId_mode: {
          deviceId: mode,
          mode: PUMP_MODE,
        },
      },
    });

    const previousState = currentControl?.command === "ON";

    // Update DeviceControls (Command Status) - ESP32 convention
    const deviceControl = await prisma.deviceControl.upsert({
      where: {
        deviceId_mode: {
          deviceId: mode, // "sawah" or "kolam"
          mode: PUMP_MODE, // Always "PUMP"
        },
      },
      update: {
        command: isOn ? "ON" : "OFF",
        actionBy: userId,
        reason: changedBy,
        updatedAt: new Date(),
      },
      create: {
        deviceId: mode, // "sawah" or "kolam"
        mode: PUMP_MODE, // Always "PUMP"
        command: isOn ? "ON" : "OFF",
        actionBy: userId,
        reason: changedBy,
      },
    });

    // Update PumpTimer (Timer Logic)
    await prisma.pumpTimer.upsert({
      where: { mode: mode },
      update: {
        duration: isOn ? (isManualMode ? null : duration) : null,
        startTime: isOn ? new Date() : null,
        isManualMode: isOn ? isManualMode : false,
        updatedAt: new Date(),
      },
      create: {
        mode: mode,
        duration: isOn ? (isManualMode ? null : duration) : null,
        startTime: isOn ? new Date() : null,
        isManualMode: isOn ? isManualMode : false,
      },
    });

    // Simpan ke history jika status berubah
    if (previousState !== isOn) {
      // Verify user exists before creating history (to avoid foreign key constraint error)
      let validUserId = null;
      if (userId) {
        const userExists = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        validUserId = userExists ? userId : null;
      }

      await prisma.pumpHistory.create({
        data: {
          mode,
          previousState: previousState,
          newState: isOn,
          changedBy,
          userId: validUserId,
          timestamp: new Date(),
        },
      });

      // Trigger PHP Bridge untuk kontrol hardware
      console.log(`[PUMP] Memicu Bridge untuk mengontrol relay...`);
      const bridgeSuccess = await triggerBridgeRelay(mode, isOn);

      if (!bridgeSuccess) {
        console.warn(`[PUMP] Bridge gagal, tapi database sudah updated`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Pompa ${mode} ${isOn ? "dihidupkan" : "dimatikan"}`,
        data: {
          mode: deviceControl.mode,
          isOn: deviceControl.command === "ON",
          updatedAt: deviceControl.updatedAt,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating pump status:", error);
    return NextResponse.json(
      { error: "Failed to update pump status" },
      { status: 500 },
    );
  }
}
