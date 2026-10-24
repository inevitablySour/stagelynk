-- AlterEnum
ALTER TYPE "BookingSource" ADD VALUE 'project_application';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "projectApplicationId" TEXT;

-- CreateTable
CREATE TABLE "ProjectListing" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "deadline" TIMESTAMP(3),
    "budgetMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetMax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hideBudget" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "categories" JSONB NOT NULL DEFAULT '[]',
    "genres" JSONB NOT NULL DEFAULT '[]',
    "requiredServices" JSONB NOT NULL DEFAULT '[]',
    "status" "JobListingStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectApplication" (
    "id" TEXT NOT NULL,
    "projectListingId" TEXT NOT NULL,
    "musicianId" TEXT NOT NULL,
    "coverMessage" TEXT NOT NULL DEFAULT '',
    "proposedFee" DOUBLE PRECISION,
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'submitted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectListing_venueId_idx" ON "ProjectListing"("venueId");

-- CreateIndex
CREATE INDEX "ProjectListing_status_idx" ON "ProjectListing"("status");

-- CreateIndex
CREATE INDEX "ProjectListing_deadline_idx" ON "ProjectListing"("deadline");

-- CreateIndex
CREATE INDEX "ProjectApplication_musicianId_idx" ON "ProjectApplication"("musicianId");

-- CreateIndex
CREATE INDEX "ProjectApplication_status_idx" ON "ProjectApplication"("status");

-- CreateIndex
CREATE INDEX "ProjectApplication_createdAt_idx" ON "ProjectApplication"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectApplication_projectListingId_musicianId_key" ON "ProjectApplication"("projectListingId", "musicianId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_projectApplicationId_key" ON "Booking"("projectApplicationId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_projectApplicationId_fkey" FOREIGN KEY ("projectApplicationId") REFERENCES "ProjectApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectListing" ADD CONSTRAINT "ProjectListing_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "VenueProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectApplication" ADD CONSTRAINT "ProjectApplication_projectListingId_fkey" FOREIGN KEY ("projectListingId") REFERENCES "ProjectListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectApplication" ADD CONSTRAINT "ProjectApplication_musicianId_fkey" FOREIGN KEY ("musicianId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

