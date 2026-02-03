import { prisma } from "@/lib/prisma";

async function checkDatabase() {
  console.log("=== DATABASE CHECK ===\n");

  // 1. Check PHReading table
  console.log("1. PHReading Table Statistics:");
  const phReadings = await prisma.pHReading.findMany({
    orderBy: { timestamp: "desc" },
    take: 20,
  });

  console.log(`   Total samples shown: ${phReadings.length}`);
  if (phReadings.length > 0) {
    const values = phReadings.map((r) => r.value);
    console.log(
      `   Values range: ${Math.min(...values)} - ${Math.max(...values)}`,
    );
    console.log(
      `   Average: ${(values.reduce((a, b) => a + b) / values.length).toFixed(2)}`,
    );
    console.log(`   Recent values:`, values.slice(0, 5));
    console.log(`   Latest timestamp: ${phReadings[0].timestamp}`);
    console.log(
      `   Oldest timestamp: ${phReadings[phReadings.length - 1].timestamp}`,
    );
  }

  // 2. Check MonitoringLog table
  console.log("\n2. MonitoringLog Table Statistics:");
  const monitoringLogs = await prisma.monitoringLog.findMany({
    orderBy: { created_at: "desc" },
    take: 20,
  });

  console.log(`   Total samples shown: ${monitoringLogs.length}`);
  if (monitoringLogs.length > 0) {
    const phValues = monitoringLogs
      .map((r) => r.ph_value)
      .filter((v) => v !== null) as number[];
    if (phValues.length > 0) {
      console.log(
        `   pH values range: ${Math.min(...phValues)} - ${Math.max(...phValues)}`,
      );
      console.log(
        `   Average pH: ${(phValues.reduce((a, b) => a + b) / phValues.length).toFixed(2)}`,
      );
      console.log(`   Recent pH values:`, phValues.slice(0, 5));
    }
    console.log(`   Latest timestamp: ${monitoringLogs[0].created_at}`);
  }

  // 3. Check date distribution
  console.log("\n3. PHReading Date Distribution:");
  const allPhReadings = await prisma.pHReading.findMany({
    orderBy: { timestamp: "desc" },
  });

  const byDate: { [key: string]: number } = {};
  allPhReadings.forEach((r) => {
    const date = new Date(r.timestamp).toISOString().split("T")[0];
    byDate[date] = (byDate[date] || 0) + 1;
  });

  Object.entries(byDate)
    .sort()
    .reverse()
    .slice(0, 10)
    .forEach(([date, count]) => {
      console.log(`   ${date}: ${count} readings`);
    });

  // 4. Sample raw data
  console.log("\n4. Last 10 PHReading Records:");
  phReadings.slice(0, 10).forEach((r) => {
    console.log(
      `   ${r.timestamp.toISOString()} | value=${r.value} | location=${r.location}`,
    );
  });

  console.log("\n=== END CHECK ===");
}

checkDatabase()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
