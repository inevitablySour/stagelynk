-- CreateEnum
CREATE TYPE "DisputeKind" AS ENUM ('cancellation', 'refund_request');

-- CreateEnum
CREATE TYPE "DisputeTiming" AS ENUM ('pre_event', 'post_event');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('pending_response', 'accepted', 'declined', 'auto_resolved', 'escalated', 'resolved_refund_full', 'resolved_refund_partial', 'resolved_no_refund');

-- CreateEnum
CREATE TYPE "DisputeInitiator" AS ENUM ('musician', 'venue');

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'partially_refunded';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledByUserId" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT;

-- AlterTable
ALTER TABLE "MusicianProfile" ADD COLUMN     "stripeConnectAccountId" TEXT,
ADD COLUMN     "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BookingDispute" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" "DisputeKind" NOT NULL,
    "timing" "DisputeTiming" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'pending_response',
    "initiatedBy" "DisputeInitiator" NOT NULL,
    "initiatorUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "requestedRefundAmount" DOUBLE PRECISION,
    "responseDeadline" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingDispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingDispute_bookingId_idx" ON "BookingDispute"("bookingId");

-- CreateIndex
CREATE INDEX "BookingDispute_status_idx" ON "BookingDispute"("status");

-- CreateIndex
CREATE INDEX "BookingDispute_timing_idx" ON "BookingDispute"("timing");

-- CreateIndex
CREATE INDEX "BookingDispute_responseDeadline_idx" ON "BookingDispute"("responseDeadline");

-- CreateIndex
CREATE UNIQUE INDEX "MusicianProfile_stripeConnectAccountId_key" ON "MusicianProfile"("stripeConnectAccountId");

-- AddForeignKey
ALTER TABLE "BookingDispute" ADD CONSTRAINT "BookingDispute_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

