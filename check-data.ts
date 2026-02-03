import { prisma } from "@/lib/prisma";

async function checkData() {
  try {
    const count = await prisma.monitoringLog.count();
    console.log("✅ Total monitoring logs:", count);

    if (count > 0) {
      // Try dengan kolom minimal
      const latest = await prisma.monitoringLog.findFirst({
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          battery_level: true,
          ph_value: true,
          level: true,
          created_at: true,
        },
      });
      console.log("✅ Latest record (minimal fields):", latest);
    } else {
      console.log("⚠️ Tidak ada data di monitoring_logs.");
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
