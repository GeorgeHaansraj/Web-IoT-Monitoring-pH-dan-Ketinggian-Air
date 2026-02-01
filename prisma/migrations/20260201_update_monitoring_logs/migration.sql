-- Rename timestamp to created_at in monitoring_logs table
ALTER TABLE "monitoring_logs" RENAME COLUMN "timestamp" TO "created_at";

-- Drop old index
DROP INDEX "monitoring_logs_timestamp_idx";

-- Create new index
CREATE INDEX "monitoring_logs_created_at_idx" ON "monitoring_logs"("created_at");
