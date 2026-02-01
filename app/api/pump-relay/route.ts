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
    const pumpStatus = await prisma.pumpStatus.findUnique({
      where: { mode },
    });

    if (!pumpStatus) {
      return NextResponse.json(
        { mode, isOn: false, message: "Data pompa tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      mode: pumpStatus.mode,
      isOn: pumpStatus.isOn,
      updatedAt: pumpStatus.updatedAt,
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
    const userId = (session?.user as { id?: string } | undefined)?.id;

    const body = await req.json();
    const { mode = "sawah", isOn, changedBy = "dashboard" } = body;

    if (isOn === undefined) {
      return NextResponse.json(
        { error: "Status pompa harus diisi (true/false)" },
        { status: 400 },
      );
    }

    // Get current status untuk riwayat
    const currentStatus = await prisma.pumpStatus.findUnique({
      where: { mode },
    });

    const previousState = currentStatus?.isOn || false;

    // Update atau buat status pompa
    const pumpStatus = await prisma.pumpStatus.upsert({
      where: { mode },
      update: {
        isOn: isOn,
        updatedAt: new Date(),
      },
      create: {
        mode,
        isOn: isOn,
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
