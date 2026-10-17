-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "slotId" TEXT;

-- CreateTable
CREATE TABLE "JobListingSlot" (
    "id" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "filled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobListingSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobListingSlot_jobListingId_idx" ON "JobListingSlot"("jobListingId");

-- CreateIndex
CREATE INDEX "JobApplication_slotId_idx" ON "JobApplication"("slotId");

-- AddForeignKey
ALTER TABLE "JobListingSlot" ADD CONSTRAINT "JobListingSlot_jobListingId_fkey" FOREIGN KEY ("jobListingId") REFERENCES "JobListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "JobListingSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

