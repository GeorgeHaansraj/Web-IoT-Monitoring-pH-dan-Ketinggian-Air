-- CreateTable
CREATE TABLE "device_status" (
    "id" TEXT NOT NULL DEFAULT 'global-device',
    "activeMode" TEXT NOT NULL,
    "battery" DOUBLE PRECISION,
    "signal" INTEGER,
    "lastUpdate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pump_status" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "isOn" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pump_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pump_history" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "previousState" BOOLEAN NOT NULL,
    "newState" BOOLEAN NOT NULL,
    "changedBy" TEXT NOT NULL DEFAULT 'dashboard',
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pump_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pump_status_mode_key" ON "pump_status"("mode");

-- CreateIndex
CREATE INDEX "pump_history_mode_timestamp_idx" ON "pump_history"("mode", "timestamp");
