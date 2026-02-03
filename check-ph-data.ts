import { prisma } from "@/lib/prisma";

async function checkPHData() {
  try {
    const count = await prisma.pHReading.count();
    console.log("✅ Total pH readings:", count);

    if (count > 0) {
      const latest = await prisma.pHReading.findFirst({
        orderBy: { timestamp: "desc" },
      });
      console.log("✅ Latest pH record:", latest);
    } else {
      console.log("⚠️ Tidak ada data pH. Perlu seed data untuk test.");
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPHData();
