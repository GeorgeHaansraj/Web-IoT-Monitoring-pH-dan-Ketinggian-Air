import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function testAuthFlow() {
    console.log("🔍 TESTING AUTHENTICATION FLOW\n");
    console.log("=".repeat(50));

    try {
        // Step 1: Test Database Connection
        console.log("\n1️⃣  Testing Database Connection...");
        await prisma.$connect();
        console.log("   ✅ Database connected successfully");

        // Step 2: Find User
        console.log("\n2️⃣  Looking for test user (phone: 0812345678)...");
        const user = await prisma.user.findUnique({
            where: { phone: "0812345678" },
        });

        if (!user) {
            console.log("   ❌ User NOT found!");
            console.log("\n   Available users:");
            const allUsers = await prisma.user.findMany({
                select: { phone: true, fullName: true, role: true },
            });
            console.table(allUsers);
            return;
        }

        console.log("   ✅ User found:");
        console.log(`      Phone: ${user.phone}`);
        console.log(`      Name: ${user.fullName}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      Password Hash: ${user.password.substring(0, 20)}...`);

        // Step 3: Test Password Verification
        console.log("\n3️⃣  Testing Password Verification...");
        const testPassword = "admin123";
        console.log(`   Testing password: "${testPassword}"`);

        const isValid = await bcrypt.compare(testPassword, user.password);

        if (isValid) {
            console.log("   ✅ Password is VALID! ✅");
        } else {
            console.log("   ❌ Password is INVALID!");
            console.log("\n   Trying to create a new hash for comparison:");
            const newHash = await bcrypt.hash(testPassword, 10);
            console.log(`   New hash: ${newHash.substring(0, 30)}...`);
            console.log(`   DB hash:  ${user.password.substring(0, 30)}...`);
        }

        // Step 4: Environment Variables Check
        console.log("\n4️⃣  Checking Environment Variables...");
        console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
        console.log(`   NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || '❌ Not set'}`);
        console.log(`   NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? '✅ Set (length: ' + process.env.NEXTAUTH_SECRET.length + ')' : '❌ Not set'}`);

        // Step 5: Test Auth Return Object
        console.log("\n5️⃣  Auth Return Object (what NextAuth would get):");
        const authObject = {
            id: user.id,
            name: user.fullName,
            email: user.phone,
            role: user.role,
        };
        console.log(JSON.stringify(authObject, null, 2));

        console.log("\n" + "=".repeat(50));
        console.log("✅ ALL TESTS COMPLETED");
        console.log("=".repeat(50));

    } catch (error: any) {
        console.error("\n❌ ERROR:", error.message);
        console.error("Stack:", error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

testAuthFlow();
