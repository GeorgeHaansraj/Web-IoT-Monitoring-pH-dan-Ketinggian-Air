
import { prisma } from './lib/prisma';

async function main() {
    console.log("--- Database Inspection ---");

    // Users
    const userCount = await prisma.user.count();
    const users = await prisma.user.findMany({ take: 3, orderBy: { createdAt: 'desc' } });
    console.log(`\nUsers (${userCount}):`);
    console.log(users);

    // PH Readings
    const phCount = await prisma.pHReading.count();
    const phReadings = await prisma.pHReading.findMany({ take: 3, orderBy: { timestamp: 'desc' } });
    console.log(`\nPHReadings (${phCount}):`);
    console.log(phReadings);

    // Water Level Readings
    const waterCount = await prisma.waterLevelReading.count();
    const waterReadings = await prisma.waterLevelReading.findMany({ take: 3, orderBy: { timestamp: 'desc' } });
    console.log(`\nWaterLevelReadings (${waterCount}):`);
    console.log(waterReadings);

    // Alerts
    const alertCount = await prisma.alert.count();
    const alerts = await prisma.alert.findMany({ take: 3, orderBy: { createdAt: 'desc' } });
    console.log(`\nAlerts (${alertCount}):`);
    console.log(alerts);

    // Device Status
    const statusCount = await prisma.deviceStatus.count();
    const statuses = await prisma.deviceStatus.findMany({ take: 3 });
    console.log(`\nDeviceStatus (${statusCount}):`);
    console.log(statuses);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
