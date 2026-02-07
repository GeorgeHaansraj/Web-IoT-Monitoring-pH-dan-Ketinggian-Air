import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function seedAdmin() {
  try {
    console.log("🔐 Seeding admin account...");

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: {
        phone: "0812345678",
      },
    });

    if (existingAdmin) {
      console.log("✓ Admin account already exists");
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        phone: "0812345678",
        fullName: "Administrator",
        password: hashedPassword,
        role: "admin",
      },
    });

    console.log("✓ Admin account created successfully");
    console.log(`  Phone: ${admin.phone}`);
    console.log(`  Name: ${admin.fullName}`);
    console.log(`  Role: ${admin.role}`);
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
