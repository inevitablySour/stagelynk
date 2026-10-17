-- CreateEnum
CREATE TYPE "NegotiationStatus" AS ENUM ('none', 'pending_response', 'counter_pending', 'expired');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "negotiationStatus" "NegotiationStatus" NOT NULL DEFAULT 'none',
ADD COLUMN     "payoutReleaseAt" TIMESTAMP(3),
ADD COLUMN     "proposedByUserId" TEXT,
ADD COLUMN     "proposedFee" DOUBLE PRECISION,
ADD COLUMN     "responseDeadline" TIMESTAMP(3);

