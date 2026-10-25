-- CreateEnum
CREATE TYPE "EquipmentKind" AS ENUM ('hardware', 'software');

-- CreateEnum
CREATE TYPE "EquipmentSource" AS ENUM ('custom', 'shopify', 'wikidata');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('active', 'pending', 'rejected', 'hidden', 'retired');

-- CreateEnum
CREATE TYPE "EquipmentSyncStatus" AS ENUM ('previewed', 'applied', 'failed');

-- DropIndex
DROP INDEX "EquipmentItem_name_key";

-- AlterTable
ALTER TABLE "EquipmentItem" ADD COLUMN     "addedManually" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "adminLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "group" TEXT NOT NULL DEFAULT 'other',
ADD COLUMN     "kind" "EquipmentKind" NOT NULL DEFAULT 'hardware',
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "path" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "source" "EquipmentSource" NOT NULL DEFAULT 'custom',
ADD COLUMN     "status" "EquipmentStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "EquipmentItem" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "EquipmentSyncRun" (
    "id" TEXT NOT NULL,
    "source" "EquipmentSource" NOT NULL,
    "status" "EquipmentSyncStatus" NOT NULL DEFAULT 'previewed',
    "version" TEXT NOT NULL DEFAULT '',
    "candidates" JSONB NOT NULL DEFAULT '[]',
    "summary" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "createdById" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EquipmentSyncRun_source_createdAt_idx" ON "EquipmentSyncRun"("source", "createdAt");

-- CreateIndex
CREATE INDEX "EquipmentItem_group_idx" ON "EquipmentItem"("group");

-- CreateIndex
CREATE INDEX "EquipmentItem_status_idx" ON "EquipmentItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentItem_source_externalId_key" ON "EquipmentItem"("source", "externalId");

