
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding API Key...");

    const existingKey = await (prisma as any).apiKey.findFirst({
        where: { name: "External Web" },
    });

    if (existingKey) {
        console.log("API Key already exists:", existingKey.key);
    } else {
        // Generate secure random key
        const newKey = "sk_" + randomBytes(16).toString("hex");

        const key = await (prisma as any).apiKey.create({
            data: {
                key: newKey,
                name: "External Web",
            },
        });
        console.log("Created NEW API Key:", key.key);
        console.log("Please save this key!");
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
