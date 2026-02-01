-- CreateIndex
CREATE INDEX "pump_history_userId_idx" ON "pump_history"("userId");

-- AddForeignKey
ALTER TABLE "pump_history" ADD CONSTRAINT "pump_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
