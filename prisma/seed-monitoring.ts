import { prisma } from "@/lib/prisma";

async function seedMonitoringLogs() {
  try {
    console.log("🌱 Seeding monitoring logs...");

    // Delete existing data
    await prisma.monitoringLog.deleteMany({});
    console.log("Cleared existing monitoring logs");

    // Create test data with realistic values
    const testData = [
      {
        battery_level: 85.5,
        ph_value: 7.2,
        level: 25.5,
        temperature: 28.3,
        signal_strength: 18,
        deviceId: "ESP32-KKN-01",
      },
      {
        battery_level: 84.2,
        ph_value: 7.3,
        level: 25.6,
        temperature: 28.4,
        signal_strength: 19,
        deviceId: "ESP32-KKN-01",
      },
      {
        battery_level: 83.8,
        ph_value: 7.25,
        level: 25.5,
        temperature: 28.2,
        signal_strength: 17,
        deviceId: "ESP32-KKN-01",
      },
      {
        battery_level: 82.5,
        ph_value: 7.4,
        level: 25.7,
        temperature: 28.5,
        signal_strength: 20,
        deviceId: "ESP32-KKN-01",
      },
    ];

    for (const data of testData) {
      const log = await prisma.monitoringLog.create({
        data: {
          ...data,
          created_at: new Date(Date.now() - Math.random() * 60000), // Random time within last minute
        },
      });
      console.log(
        `✓ Created log: Battery=${log.battery_level}%, pH=${log.ph_value}, Level=${log.level}cm`,
      );
    }

    console.log("✅ Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedMonitoringLogs();
