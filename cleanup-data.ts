
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Define time range: Today (Jan 31, 2026) since the seed script ran then.
    // User's real data is from Jan 30.
    const startOfToday = new Date('2026-01-31T00:00:00.000Z');

    console.log(`Deleting MonitoringLogs created after ${startOfToday.toISOString()}...`);
    const logs = await prisma.monitoringLog.deleteMany({
        where: {
            created_at: {
                gte: startOfToday,
            },
        },
    });
    console.log(`Deleted ${logs.count} MonitoringLog records.`);

    // Also cleaning WaterLevelReadings just in case, though schema changed so much.
    // Wait, monitoring_log handles ph and battery. WaterLevelReading handles water level.
    // Did we seed water level readings too? Yes, "seed-sensor-data.ts"

    console.log(`Deleting WaterLevelReadings created after ${startOfToday.toISOString()}...`);
    const water = await prisma.waterLevelReading.deleteMany({
        where: {
            timestamp: {
                gte: startOfToday,
            },
        },
    });
    console.log(`Deleted ${water.count} WaterLevelReading records.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
