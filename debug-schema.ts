import { prisma } from "@/lib/prisma";

async function checkData() {
  try {
    // Jangan gunakan select, ambil semua terlebih dulu
    const all = await prisma.monitoringLog.findMany({
      take: 1,
      orderBy: { created_at: "desc" },
    });
    console.log("Raw record structure:", JSON.stringify(all, null, 2));
  } catch (error: any) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
