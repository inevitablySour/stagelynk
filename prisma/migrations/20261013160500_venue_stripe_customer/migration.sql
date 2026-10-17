-- AlterTable
ALTER TABLE "VenueProfile" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "VenueProfile_stripeCustomerId_key" ON "VenueProfile"("stripeCustomerId");

