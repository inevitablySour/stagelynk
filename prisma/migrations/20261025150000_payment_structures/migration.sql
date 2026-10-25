-- CreateEnum
CREATE TYPE "PaymentStructure" AS ENUM ('full_sum', 'deposit_balance', 'milestone');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('pending', 'submitted', 'approved', 'paid');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "balanceChargedAt" TIMESTAMP(3),
ADD COLUMN     "balanceDueAt" TIMESTAMP(3),
ADD COLUMN     "balanceFailedAt" TIMESTAMP(3),
ADD COLUMN     "balancePaymentIntentId" TEXT,
ADD COLUMN     "paymentStructure" "PaymentStructure" NOT NULL DEFAULT 'full_sum';

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "proposedMilestones" JSONB,
ADD COLUMN     "selectedPaymentStructure" "PaymentStructure" NOT NULL DEFAULT 'full_sum';

-- AlterTable
ALTER TABLE "JobListing" ADD COLUMN     "depositPercent" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "offeredPaymentStructures" "PaymentStructure"[] DEFAULT ARRAY['full_sum']::"PaymentStructure"[];

-- AlterTable
ALTER TABLE "MarketplaceTransaction" ADD COLUMN     "transactionType" TEXT NOT NULL DEFAULT 'full';

-- AlterTable
ALTER TABLE "ProjectApplication" ADD COLUMN     "proposedMilestones" JSONB,
ADD COLUMN     "selectedPaymentStructure" "PaymentStructure" NOT NULL DEFAULT 'full_sum';

-- AlterTable
ALTER TABLE "ProjectListing" ADD COLUMN     "depositPercent" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "offeredPaymentStructures" "PaymentStructure"[] DEFAULT ARRAY['full_sum']::"PaymentStructure"[];

-- CreateTable
CREATE TABLE "BookingMilestone" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'pending',
    "stripePaymentIntentId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingMilestone_bookingId_idx" ON "BookingMilestone"("bookingId");

-- AddForeignKey
ALTER TABLE "BookingMilestone" ADD CONSTRAINT "BookingMilestone_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

