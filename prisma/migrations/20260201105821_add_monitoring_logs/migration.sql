-- CreateTable
CREATE TABLE "monitoring_logs" (
    "id" TEXT NOT NULL,
    "battery_level" DOUBLE PRECISION,
    "ph_value" DOUBLE PRECISION,
    "level" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "signal_strength" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT,

    CONSTRAINT "monitoring_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monitoring_logs_timestamp_idx" ON "monitoring_logs"("timestamp");
