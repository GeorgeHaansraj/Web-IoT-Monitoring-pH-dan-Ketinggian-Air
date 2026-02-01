import { prisma } from "@/lib/prisma";

async function seedPhReadings() {
  try {
    console.log("🌱 Seeding pH readings...");

    // Delete existing data
    await prisma.pHReading.deleteMany({});
    console.log("Cleared existing pH readings");

    // Create test data - simulate pH readings from last 24 hours
    const testData = [];
    const now = new Date();

    for (let i = 0; i < 48; i++) {
      const timestamp = new Date(now.getTime() - i * 30 * 60 * 1000); // 30 min intervals

      testData.push({
        value: 7.0 + Math.sin(i * 0.2) * 0.5, // Oscillate around pH 7
        location: i % 2 === 0 ? "sawah" : "kolam",
        timestamp,
        deviceId: i % 2 === 0 ? "ESP32-KKN-01" : "ESP32-KKN-02",
        temperature: 26 + Math.random() * 4, // 26-30°C
      });
    }

    for (const data of testData) {
      const reading = await prisma.pHReading.create({
        data,
      });
      console.log(
        `✓ Created pH reading: pH=${reading.value.toFixed(2)}, Location=${reading.location}`,
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

seedPhReadings();
