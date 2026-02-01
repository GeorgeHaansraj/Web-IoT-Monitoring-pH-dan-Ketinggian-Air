
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching latest 10 MonitoringLogs (Global)...');
    const logs = await prisma.monitoringLog.findMany({
        orderBy: {
            created_at: 'desc',
        },
        take: 10,
    });

    console.log(JSON.stringify(logs, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
