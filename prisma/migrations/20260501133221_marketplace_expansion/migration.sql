/*
  Warnings:

  - A unique constraint covering the columns `[jobApplicationId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('direct_request', 'job_application', 'manual');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'authorized', 'paid', 'failed', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'scheduled', 'paid', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "JobListingStatus" AS ENUM ('draft', 'published', 'paused', 'closed', 'filled', 'expired');

-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('submitted', 'shortlisted', 'declined', 'accepted', 'withdrawn');

-- CreateEnum
CREATE TYPE "PromotionPlacement" AS ENUM ('talent_search', 'job_listing', 'homepage_featured', 'category_search');

-- CreateEnum
CREATE TYPE "PromotionBillingModel" AS ENUM ('time_based', 'view_based');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('profile_view', 'search_impression', 'search_click', 'booking_request', 'booking_accept', 'booking_complete', 'job_view', 'job_apply', 'promotion_view', 'promotion_click');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEventCategory" ADD VALUE 'payment';
ALTER TYPE "AuditEventCategory" ADD VALUE 'job';
ALTER TYPE "AuditEventCategory" ADD VALUE 'promotion';
ALTER TYPE "AuditEventCategory" ADD VALUE 'analytics';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "audienceSize" INTEGER,
ADD COLUMN     "cancellationPolicy" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'GBP',
ADD COLUMN     "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "equipmentProvided" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "eventType" TEXT NOT NULL DEFAULT 'Live performance',
ADD COLUMN     "hospitality" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "jobApplicationId" TEXT,
ADD COLUMN     "loadInTime" TEXT,
ADD COLUMN     "netPayoutAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "platformFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "platformFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
ADD COLUMN     "processorFeeEstimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "requiredServices" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "setupNotes" TEXT,
ADD COLUMN     "soundcheckTime" TEXT,
ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'direct_request',
ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'Gig booking',
ADD COLUMN     "totalChargeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "venueAddress" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "MusicianProfile" ADD COLUMN     "primaryCategory" TEXT NOT NULL DEFAULT 'musician';

-- AlterTable
ALTER TABLE "VenueProfile" ADD COLUMN     "clientType" TEXT NOT NULL DEFAULT 'venue';

-- CreateTable
CREATE TABLE "JobListing" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "eventType" TEXT NOT NULL DEFAULT 'Live performance',
    "eventDate" TIMESTAMP(3),
    "startTime" TEXT,
    "endTime" TEXT,
    "venueAddress" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "budgetMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetMax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "categories" JSONB NOT NULL DEFAULT '[]',
    "genres" JSONB NOT NULL DEFAULT '[]',
    "requiredServices" JSONB NOT NULL DEFAULT '[]',
    "equipmentProvided" JSONB NOT NULL DEFAULT '[]',
    "applicationDeadline" TIMESTAMP(3),
    "status" "JobListingStatus" NOT NULL DEFAULT 'draft',
    "isPromoted" BOOLEAN NOT NULL DEFAULT false,
    "visibilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "musicianId" TEXT NOT NULL,
    "coverMessage" TEXT NOT NULL DEFAULT '',
    "proposedFee" DOUBLE PRECISION,
    "availabilityNotes" TEXT,
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'submitted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceTransaction" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "provider" TEXT,
    "providerPaymentId" TEXT,
    "performanceFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "platformFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processorFeeEstimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalChargeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "artistPayoutAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "musicianId" TEXT NOT NULL,
    "providerPayoutId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "status" "PayoutStatus" NOT NULL DEFAULT 'pending',
    "scheduledFor" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionPricingOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "placement" "PromotionPlacement" NOT NULL,
    "billingModel" "PromotionBillingModel" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "durationDays" INTEGER,
    "includedViews" INTEGER,
    "description" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionPricingOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionCampaign" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "jobListingId" TEXT,
    "pricingOptionId" TEXT,
    "placement" "PromotionPlacement" NOT NULL,
    "billingModel" "PromotionBillingModel" NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'draft',
    "budgetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "viewLimit" INTEGER,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventType" "AnalyticsEventType" NOT NULL,
    "actorUserId" TEXT,
    "musicianId" TEXT,
    "venueId" TEXT,
    "bookingId" TEXT,
    "jobListingId" TEXT,
    "promotionCampaignId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CreativeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentCategory" (
    "id" TEXT NOT NULL,
    "musicianId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "TalentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobListing_venueId_idx" ON "JobListing"("venueId");

-- CreateIndex
CREATE INDEX "JobListing_status_idx" ON "JobListing"("status");

-- CreateIndex
CREATE INDEX "JobListing_eventDate_idx" ON "JobListing"("eventDate");

-- CreateIndex
CREATE INDEX "JobListing_applicationDeadline_idx" ON "JobListing"("applicationDeadline");

-- CreateIndex
CREATE INDEX "JobListing_isPromoted_visibilityScore_idx" ON "JobListing"("isPromoted", "visibilityScore");

-- CreateIndex
CREATE INDEX "JobApplication_musicianId_idx" ON "JobApplication"("musicianId");

-- CreateIndex
CREATE INDEX "JobApplication_status_idx" ON "JobApplication"("status");

-- CreateIndex
CREATE INDEX "JobApplication_createdAt_idx" ON "JobApplication"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_jobListingId_musicianId_key" ON "JobApplication"("jobListingId", "musicianId");

-- CreateIndex
CREATE INDEX "MarketplaceTransaction_bookingId_idx" ON "MarketplaceTransaction"("bookingId");

-- CreateIndex
CREATE INDEX "MarketplaceTransaction_status_idx" ON "MarketplaceTransaction"("status");

-- CreateIndex
CREATE INDEX "MarketplaceTransaction_providerPaymentId_idx" ON "MarketplaceTransaction"("providerPaymentId");

-- CreateIndex
CREATE INDEX "MarketplaceTransaction_createdAt_idx" ON "MarketplaceTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "Payout_transactionId_idx" ON "Payout"("transactionId");

-- CreateIndex
CREATE INDEX "Payout_musicianId_idx" ON "Payout"("musicianId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "PromotionPricingOption_placement_billingModel_idx" ON "PromotionPricingOption"("placement", "billingModel");

-- CreateIndex
CREATE INDEX "PromotionPricingOption_active_idx" ON "PromotionPricingOption"("active");

-- CreateIndex
CREATE INDEX "PromotionCampaign_venueId_idx" ON "PromotionCampaign"("venueId");

-- CreateIndex
CREATE INDEX "PromotionCampaign_jobListingId_idx" ON "PromotionCampaign"("jobListingId");

-- CreateIndex
CREATE INDEX "PromotionCampaign_placement_status_idx" ON "PromotionCampaign"("placement", "status");

-- CreateIndex
CREATE INDEX "PromotionCampaign_startsAt_endsAt_idx" ON "PromotionCampaign"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_idx" ON "AnalyticsEvent"("eventType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_actorUserId_idx" ON "AnalyticsEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_musicianId_idx" ON "AnalyticsEvent"("musicianId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_venueId_idx" ON "AnalyticsEvent"("venueId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_bookingId_idx" ON "AnalyticsEvent"("bookingId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_jobListingId_idx" ON "AnalyticsEvent"("jobListingId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_promotionCampaignId_idx" ON "AnalyticsEvent"("promotionCampaignId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_occurredAt_idx" ON "AnalyticsEvent"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeCategory_name_key" ON "CreativeCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeCategory_slug_key" ON "CreativeCategory"("slug");

-- CreateIndex
CREATE INDEX "CreativeCategory_slug_idx" ON "CreativeCategory"("slug");

-- CreateIndex
CREATE INDEX "TalentCategory_categoryId_idx" ON "TalentCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "TalentCategory_musicianId_categoryId_key" ON "TalentCategory"("musicianId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_jobApplicationId_key" ON "Booking"("jobApplicationId");

-- CreateIndex
CREATE INDEX "Booking_source_idx" ON "Booking"("source");

-- CreateIndex
CREATE INDEX "Booking_paymentStatus_idx" ON "Booking"("paymentStatus");

-- CreateIndex
CREATE INDEX "Booking_payoutStatus_idx" ON "Booking"("payoutStatus");

-- CreateIndex
CREATE INDEX "MusicianProfile_primaryCategory_idx" ON "MusicianProfile"("primaryCategory");

-- CreateIndex
CREATE INDEX "VenueProfile_clientType_idx" ON "VenueProfile"("clientType");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_jobApplicationId_fkey" FOREIGN KEY ("jobApplicationId") REFERENCES "JobApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobListing" ADD CONSTRAINT "JobListing_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "VenueProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobListingId_fkey" FOREIGN KEY ("jobListingId") REFERENCES "JobListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_musicianId_fkey" FOREIGN KEY ("musicianId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceTransaction" ADD CONSTRAINT "MarketplaceTransaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "MarketplaceTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_musicianId_fkey" FOREIGN KEY ("musicianId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionCampaign" ADD CONSTRAINT "PromotionCampaign_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "VenueProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionCampaign" ADD CONSTRAINT "PromotionCampaign_jobListingId_fkey" FOREIGN KEY ("jobListingId") REFERENCES "JobListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionCampaign" ADD CONSTRAINT "PromotionCampaign_pricingOptionId_fkey" FOREIGN KEY ("pricingOptionId") REFERENCES "PromotionPricingOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentCategory" ADD CONSTRAINT "TalentCategory_musicianId_fkey" FOREIGN KEY ("musicianId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentCategory" ADD CONSTRAINT "TalentCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CreativeCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
