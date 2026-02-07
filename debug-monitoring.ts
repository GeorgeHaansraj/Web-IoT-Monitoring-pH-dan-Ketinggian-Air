
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing MonitoringLog connection...');
        const latestLog = await prisma.monitoringLog.findFirst({
            orderBy: { created_at: "desc" },
            select: {
                signal_strength: true,
                deviceId: true
            }
        });
        console.log('Success:', latestLog);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
