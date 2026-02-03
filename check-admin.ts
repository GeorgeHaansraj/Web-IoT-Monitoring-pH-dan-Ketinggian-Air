import { prisma } from "@/lib/prisma";

async function checkAdminAccount() {
  try {
    const admin = await prisma.user.findUnique({
      where: { email: "admin" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (admin) {
      console.log("✅ Admin account exists:");
      console.log(`  Email: ${admin.email}`);
      console.log(`  Name: ${admin.name}`);
      console.log(`  Role: ${admin.role}`);
      console.log(`  Created: ${admin.createdAt}`);
      console.log("\n📝 Login Credentials:");
      console.log(`  Username: ${admin.email}`);
      console.log(`  Password: admin123`);
      console.log("\n🔗 Access: http://localhost:3000/login");
    } else {
      console.log("❌ Admin account not found!");
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminAccount();
