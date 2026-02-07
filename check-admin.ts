import { prisma } from "@/lib/prisma";

async function checkAdminAccount() {
  try {
    const admin = await prisma.user.findUnique({
      where: { phone: "0812345678" },
      select: {
        id: true,
        phone: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    if (admin) {
      console.log("✅ Admin account exists:");
      console.log(`  Phone: ${admin.phone}`);
      console.log(`  Name: ${admin.fullName}`);
      console.log(`  Role: ${admin.role}`);
      console.log(`  Created: ${admin.createdAt}`);
      console.log("\n📝 Login Credentials:");
      console.log(`  Phone: ${admin.phone}`);
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
