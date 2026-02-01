-- AlterTable
ALTER TABLE "pump_status" ADD COLUMN     "isManualMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pumpDuration" INTEGER,
ADD COLUMN     "pumpStartTime" TIMESTAMP(3);
