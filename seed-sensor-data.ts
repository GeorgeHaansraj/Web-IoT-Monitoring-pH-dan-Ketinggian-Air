import { prisma } from './lib/prisma';

async function main() {
    console.log('🌱 Seeding sensor data...');

    // Seed Device Status
    const deviceStatus = await prisma.deviceStatus.upsert({
        where: { id: 'global-device' },
        create: {
            id: 'global-device',
            activeMode: 'sawah',
            battery: 85.5,
            signal: 4,
        },
        update: {
            battery: 85.5,
            signal: 4,
        },
    });
    console.log('✅ Device status:', deviceStatus);

    // Seed pH Readings for Sawah (MonitoringLogs)
    const now = new Date();
    const phReadingsSawah = [];
    for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // Every hour
        const reading = await prisma.monitoringLog.create({
            data: {
                ph_value: 7.0 + Math.random() * 0.6 - 0.3, // pH 6.7 - 7.3
                deviceId: 'sawah',
                battery_level: 85.0 - (i * 0.5), // Simulated battery drain
                created_at: timestamp,
            },
        });
        phReadingsSawah.push(reading);
    }
    console.log(`✅ Created ${phReadingsSawah.length} monitoring logs for Sawah`);

    // Seed pH Readings for Kolam (MonitoringLogs)
    const phReadingsKolam = [];
    for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        const reading = await prisma.monitoringLog.create({
            data: {
                ph_value: 7.2 + Math.random() * 0.8 - 0.4, // pH 6.8 - 7.6
                deviceId: 'kolam',
                battery_level: 90.0 - (i * 0.4),
                created_at: timestamp,
            },
        });
        phReadingsKolam.push(reading);
    }
    console.log(`✅ Created ${phReadingsKolam.length} monitoring logs for Kolam`);

    // Seed Water Level Readings for Sawah
    const waterLevelSawah = [];
    for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        const level = 40 + Math.random() * 20; // 40-60 cm
        const reading = await prisma.waterLevelReading.create({
            data: {
                level,
                // location removed
                // deviceId removed
                // status removed
                timestamp,
            },
        });
        waterLevelSawah.push(reading);
    }
    console.log(`✅ Created ${waterLevelSawah.length} water level readings for Sawah`);

    // Seed Water Level Readings for Kolam
    const waterLevelKolam = [];
    for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        const level = 60 + Math.random() * 30; // 60-90 cm
        const reading = await prisma.waterLevelReading.create({
            data: {
                level,
                // location removed
                // deviceId removed
                // status removed
                timestamp,
            },
        });
        waterLevelKolam.push(reading);
    }
    console.log(`✅ Created ${waterLevelKolam.length} water level readings for Kolam`);

    // Seed some alerts
    await prisma.alert.create({
        data: {
            type: 'ph_low',
            message: 'pH level too low at Sawah: 6.3',
            location: 'sawah',
            severity: 'medium',
            isRead: false,
        },
    });

    await prisma.alert.create({
        data: {
            type: 'water_high',
            message: 'Water level high at Kolam: 88cm',
            location: 'kolam',
            severity: 'medium',
            isRead: false,
        },
    });

    console.log('✅ Created sample alerts');
    console.log('🎉 Seeding completed!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding data:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
