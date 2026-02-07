import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with default users...");

  // Create default users
  const defaultUsers = [
    {
      fullName: "Admin",
      phone: "081293017371",
      password: "admin123",
      role: "admin",
    },
  ];

  for (const userData of defaultUsers) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: userData.phone },
    });

    if (existingUser) {
      console.log(`✅ User ${userData.fullName} already exists`);
      continue;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
    });

    console.log(`✅ Created user: ${user.fullName} (${user.role})`);
  }

  console.log("🎉 Database seeding completed!");
  console.log("\nDefault login credentials:");
  console.log("Admin User - Phone: 082379238544, Password: admin123");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
