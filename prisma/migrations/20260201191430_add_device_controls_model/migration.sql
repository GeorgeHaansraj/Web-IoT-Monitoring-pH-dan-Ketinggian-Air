-- CreateTable
CREATE TABLE "device_controls" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT,
    "mode" TEXT,
    "command" TEXT NOT NULL DEFAULT 'OFF',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionBy" TEXT,
    "reason" TEXT,

    CONSTRAINT "device_controls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_controls_updatedAt_idx" ON "device_controls"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "device_controls_deviceId_mode_key" ON "device_controls"("deviceId", "mode");
