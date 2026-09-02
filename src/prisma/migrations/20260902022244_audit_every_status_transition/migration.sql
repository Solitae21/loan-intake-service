-- DropForeignKey
ALTER TABLE "AuditLogs" DROP CONSTRAINT "AuditLogs_actorId_fkey";

-- CreateIndex
CREATE INDEX "AuditLogs_applicationId_createdAt_idx" ON "AuditLogs"("applicationId", "createdAt");
