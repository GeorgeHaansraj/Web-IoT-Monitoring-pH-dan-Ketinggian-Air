import { prisma } from "@/lib/prisma";

async function seedCriticalData() {
  try {
    console.log("🌱 Seeding critical device and control data...");

    // 1. Clear existing data (safe because User table is separate)
    await prisma.deviceControl.deleteMany({});
    await prisma.pumpStatus.deleteMany({});
    await prisma.pumpTimer.deleteMany({});
    await prisma.deviceStatus.deleteMany({});
    console.log("✓ Cleared existing device and control data");

    // 2. Create DeviceStatus (global device state)
    const deviceStatus = await prisma.deviceStatus.create({
      data: {
        id: "global-device",
        activeMode: "sawah",
        battery: 85.5,
        signal: 18,
        pumpStatus: false,
      },
    });
    console.log(`✓ Created DeviceStatus: Mode=${deviceStatus.activeMode}`);

    // 3. Create PumpStatus for each mode (sawah and kolam)
    const pumpStates = [
      {
        mode: "sawah",
        isOn: false,
        isManualMode: false,
        pumpDuration: null,
        pumpStartTime: null,
      },
      {
        mode: "kolam",
        isOn: false,
        isManualMode: false,
        pumpDuration: null,
        pumpStartTime: null,
      },
    ];

    for (const state of pumpStates) {
      const pumpStatus = await prisma.pumpStatus.create({
        data: state,
      });
      console.log(`✓ Created PumpStatus: Mode=${pumpStatus.mode}, Status=${pumpStatus.isOn ? "ON" : "OFF"}`);
    }

    // 4. Create DeviceControl for pump control
    const deviceControls = [
      {
        deviceId: "ESP32-KKN-01",
        mode: "sawah",
        command: "OFF",
        actionBy: "system",
        reason: "Initial setup",
      },
      {
        deviceId: "ESP32-KKN-02",
        mode: "kolam",
        command: "OFF",
        actionBy: "system",
        reason: "Initial setup",
      },
    ];

    for (const control of deviceControls) {
      const deviceControl = await prisma.deviceControl.create({
        data: control,
      });
      console.log(`✓ Created DeviceControl: Device=${deviceControl.deviceId}, Mode=${deviceControl.mode}, Command=${deviceControl.command}`);
    }

    // 5. Create PumpTimers for scheduled operations
    const pumpTimers = [
      {
        mode: "sawah",
        duration: null,
        startTime: null,
        isManualMode: false,
      },
      {
        mode: "kolam",
        duration: null,
        startTime: null,
        isManualMode: false,
      },
    ];

    for (const timer of pumpTimers) {
      const pumpTimer = await prisma.pumpTimer.create({
        data: timer,
      });
      console.log(`✓ Created PumpTimer: Mode=${pumpTimer.mode}`);
    }

    console.log("✅ Critical data seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding critical data:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedCriticalData();
