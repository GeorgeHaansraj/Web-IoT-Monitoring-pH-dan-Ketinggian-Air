import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/device-control?mode=sawah&device_id=ESP32-KKN-01
 * 
 * Ambil command state terkini untuk device/mode tertentu
 * 
 * Response:
 * {
 *   "success": true,
 *   "command": "ON" | "OFF",
 *   "mode": "sawah",
 *   "updated_at": "2025-02-01T12:34:56Z",
 *   "age_seconds": 45
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "sawah";
    const device_id = searchParams.get("device_id") || null;

    // Cari command untuk device+mode ini (atau mode saja jika device_id tidak ada)
    const deviceControl = await prisma.deviceControl.findFirst({
      where: {
        AND: [
          {
            OR: [
              { deviceId: device_id },
              { deviceId: null }, // Fallback ke global command
            ],
          },
          {
            OR: [{ mode: mode }, { mode: null }],
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });

    const command = deviceControl?.command || "OFF";
    const updated_at = deviceControl?.updatedAt || new Date();

    // Hitung umur command
    const age_seconds = Math.floor(
      (Date.now() - updated_at.getTime()) / 1000
    );

    // Jika command lebih dari 2 jam lalu, consider expired (safety measure)
    const is_expired = age_seconds > 7200; // 2 jam

    return NextResponse.json({
      success: true,
      command: is_expired ? "OFF" : command,
      mode,
      device_id,
      updated_at: updated_at.toISOString(),
      age_seconds,
      is_expired,
    });
  } catch (error) {
    console.error("[DEVICE-CONTROL GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch device control", command: "OFF" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/device-control
 * 
 * Update command state untuk device/mode
 * 
 * Request Body:
 * {
 *   "command": "ON" | "OFF",
 *   "mode": "sawah" | "kolam",
 *   "device_id": "ESP32-KKN-01" (opsional),
 *   "reason": "User clicked ON button" (opsional)
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "command": "ON",
 *   "updated_at": "..."
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    // Autentikasi user
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { command, mode, device_id, reason } = body;

    // Validasi input
    if (!command || !["ON", "OFF", "STANDBY"].includes(command)) {
      return NextResponse.json(
        { success: false, error: "Invalid command" },
        { status: 400 }
      );
    }

    const mode_clean = (mode || "sawah") as "sawah" | "kolam";
    const device_clean = device_id || null;

    console.log(`[DEVICE-CONTROL PUT] User: ${session.user.email} | Command: ${command} | Mode: ${mode_clean}`);

    // Upsert: Jika sudah ada untuk mode ini, update. Jika belum, create.
    const deviceControl = await prisma.deviceControl.upsert({
      where: {
        // Gunakan unique constraint [deviceId, mode]
        // Kita cari berdasarkan mode saja, jadi query yang tepat
        id: "placeholder", // Ini akan di-override oleh findUnique logic
      } as any,
      create: {
        command,
        mode: mode_clean,
        deviceId: device_clean,
        actionBy: session.user.email,
        reason: reason || null,
      },
      update: {
        command,
        actionBy: session.user.email,
        reason: reason || null,
        updatedAt: new Date(),
      },
    });

    // Karena upsert kompleks dengan composite key, gunakan alternatif:
    // Cari dulu, lalu update atau create
    const existing = await prisma.deviceControl.findFirst({
      where: {
        mode: mode_clean,
        deviceId: device_clean,
      },
    });

    let result;
    if (existing) {
      result = await prisma.deviceControl.update({
        where: { id: existing.id },
        data: {
          command,
          actionBy: session.user.email,
          reason: reason || null,
          updatedAt: new Date(),
        },
      });
    } else {
      result = await prisma.deviceControl.create({
        data: {
          command,
          mode: mode_clean,
          deviceId: device_clean,
          actionBy: session.user.email,
          reason: reason || null,
        },
      });
    }

    console.log(`[DEVICE-CONTROL PUT] Updated command to: ${command}`);

    return NextResponse.json({
      success: true,
      command: result.command,
      mode: result.mode,
      updated_at: result.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[DEVICE-CONTROL PUT] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update device control" },
      { status: 500 }
    );
  }
}
