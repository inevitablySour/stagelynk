-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('degree', 'certificate', 'license', 'award');

-- AlterTable
ALTER TABLE "MusicianProfile" DROP COLUMN "availability",
ADD COLUMN     "instruments" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "musicianId" TEXT NOT NULL,
    "type" "CredentialType" NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL DEFAULT '',
    "year" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "musicianId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Credential_musicianId_idx" ON "Credential"("musicianId");

-- CreateIndex
CREATE INDEX "Credential_type_idx" ON "Credential"("type");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_musicianId_idx" ON "AvailabilitySlot"("musicianId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_startDate_idx" ON "AvailabilitySlot"("startDate");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_endDate_idx" ON "AvailabilitySlot"("endDate");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_musicianId_fkey" FOREIGN KEY ("musicianId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_musicianId_fkey" FOREIGN KEY ("musicianId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

