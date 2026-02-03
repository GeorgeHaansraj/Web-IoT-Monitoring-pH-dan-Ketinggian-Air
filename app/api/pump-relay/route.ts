import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Konfigurasi Bridge PHP
const BRIDGE_URL = process.env.BRIDGE_PHP_URL || "http://20.2.138.40";

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

    // Ambil status pompa terbaru dari database
    let pumpStatus = await prisma.pumpStatus.findUnique({
      where: { mode },
    });

    if (!pumpStatus) {
      return NextResponse.json(
        { mode, isOn: false, message: "Data pompa tidak ditemukan" },
        { status: 404 },
      );
    }

    // Auto-OFF logic untuk timed mode
    if (
      pumpStatus.isOn &&
      !pumpStatus.isManualMode &&
      pumpStatus.pumpStartTime &&
      pumpStatus.pumpDuration
    ) {
      const elapsed =
        (Date.now() - pumpStatus.pumpStartTime.getTime()) / (1000 * 60 * 60); // dalam jam
      if (elapsed > pumpStatus.pumpDuration) {
        // Auto-OFF: waktu habis
        console.log(
          `[PUMP] Auto-OFF duration expired for ${mode} (elapsed: ${elapsed.toFixed(2)}h, duration: ${pumpStatus.pumpDuration}h)`,
        );

        pumpStatus = await prisma.pumpStatus.update({
          where: { mode },
          data: {
            isOn: false,
            updatedAt: new Date(),
            isManualMode: false,
            pumpDuration: null,
            pumpStartTime: null,
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
      }
    }

    return NextResponse.json({
      mode: pumpStatus.mode,
      isOn: pumpStatus.isOn,
      updatedAt: pumpStatus.updatedAt,
      isManualMode: pumpStatus.isManualMode,
      pumpDuration: pumpStatus.pumpDuration,
      pumpStartTime: pumpStatus.pumpStartTime,
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

    // SECURITY: Any authenticated user can control pump, but we track who
    // Admin controls are for viewing history and managing other users
    const userId = (session.user as { id?: string }).id;
    const userName = (session.user as { name?: string }).name || "Unknown";

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
      console.log("[PUMP] Heartbeat check - verifying session for ON command");
      if (!session || !session.user) {
        return NextResponse.json(
          { error: "Session invalid - cannot turn pump ON" },
          { status: 401 },
        );
      }
    }

    // Get current status untuk riwayat
    const currentStatus = await prisma.pumpStatus.findUnique({
      where: { mode },
    });

    const previousState = currentStatus?.isOn || false;

    // SECURITY: Check pump timeout (24 hours) - auto-OFF if exceeded
    const PUMP_TIMEOUT_HOURS = 24;
    const lastUpdate = currentStatus?.updatedAt
      ? new Date(currentStatus.updatedAt)
      : null;
    if (lastUpdate && isOn && currentStatus?.isOn) {
      const hoursSinceUpdate =
        (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate > PUMP_TIMEOUT_HOURS) {
        console.warn(
          `[PUMP] Pump timeout exceeded (${hoursSinceUpdate.toFixed(1)}h), auto-turning OFF`,
        );
        // Auto turn off pump
        const timeoutPumpStatus = await prisma.pumpStatus.update({
          where: { mode },
          data: {
            isOn: false,
            updatedAt: new Date(),
          },
        });

        // Log timeout event
        await prisma.pumpHistory.create({
          data: {
            mode,
            previousState: true,
            newState: false,
            changedBy: "auto-timeout",
            userId: userId || null,
            timestamp: new Date(),
          },
        });

        return NextResponse.json(
          {
            success: true,
            message: `Pompa ${mode} dimatikan otomatis (timeout ${PUMP_TIMEOUT_HOURS}h)`,
            data: {
              mode: timeoutPumpStatus.mode,
              isOn: timeoutPumpStatus.isOn,
              updatedAt: timeoutPumpStatus.updatedAt,
              reason: "timeout",
            },
          },
          { status: 200 },
        );
      }
    }

    // Update atau buat status pompa
    const pumpStatus = await prisma.pumpStatus.upsert({
      where: { mode },
      update: {
        isOn: isOn,
        updatedAt: new Date(),
        isManualMode: isOn ? isManualMode : false,
        pumpDuration: isOn ? (isManualMode ? null : duration) : null,
        pumpStartTime: isOn ? new Date() : null,
      },
      create: {
        mode,
        isOn: isOn,
        isManualMode: isOn ? isManualMode : false,
        pumpDuration: isOn ? (isManualMode ? null : duration) : null,
        pumpStartTime: isOn ? new Date() : null,
      },
    });

    // Simpan ke history jika status berubah
    if (previousState !== isOn) {
      await prisma.pumpHistory.create({
        data: {
          mode,
          previousState: previousState,
          newState: isOn,
          changedBy,
          userId: userId || null, // Capture user ID dari session
          timestamp: new Date(),
        },
      });

      // TAMBAHAN: Trigger PHP Bridge untuk kontrol hardware
      console.log(`[PUMP] Memicu Bridge untuk mengontrol relay...`);
      const bridgeSuccess = await triggerBridgeRelay(mode, isOn);

      if (!bridgeSuccess) {
        console.warn(`[PUMP] Bridge gagal, tapi database sudah updated`);
        // Jangan error, database sudah tersimpan
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Pompa ${mode} ${isOn ? "dihidupkan" : "dimatikan"}`,
        data: {
          mode: pumpStatus.mode,
          isOn: pumpStatus.isOn,
          updatedAt: pumpStatus.updatedAt,
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
