import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function seedDeviceStatus() {
    console.log('🌱 Seeding DeviceStatus...');

    try {
        // Create or update device status
        const deviceStatus = await prisma.deviceStatus.upsert({
            where: {
                id: 'global-device',
            },
            create: {
                id: 'global-device',
                activeMode: 'sawah',
                battery: 79.5,
                signal: 85,
            },
            update: {
                activeMode: 'sawah',
                battery: 79.5,
                signal: 85,
            },
        });

        console.log('✅ DeviceStatus created/updated:', deviceStatus);
    } catch (error) {
        console.error('❌ Error seeding DeviceStatus:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedDeviceStatus()
    .then(() => {
        console.log('✨ Seeding complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Failed to seed:', error);
        process.exit(1);
    });
