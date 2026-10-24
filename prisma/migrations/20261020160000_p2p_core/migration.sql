-- CreateEnum
CREATE TYPE "P2PMatchStatus" AS ENUM ('pending', 'mutual', 'declined');

-- CreateEnum
CREATE TYPE "P2PDealType" AS ENUM ('flat_fee', 'milestone', 'split_50_50');

-- CreateEnum
CREATE TYPE "P2PDealStatus" AS ENUM ('proposed', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "P2PMilestoneStatus" AS ENUM ('pending', 'submitted', 'approved', 'paid');

-- CreateTable
CREATE TABLE "P2PQuestionnaireResponse" (
    "id" TEXT NOT NULL,
    "musicianId" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "P2PQuestionnaireResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "P2PMatch" (
    "id" TEXT NOT NULL,
    "musicianAId" TEXT NOT NULL,
    "musicianBId" TEXT NOT NULL,
    "initiatedBy" TEXT NOT NULL,
    "status" "P2PMatchStatus" NOT NULL DEFAULT 'pending',
    "respondedAt" TIMESTAMP(3),
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "P2PMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "P2PDeal" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "payerId" TEXT,
    "payeeId" TEXT,
    "dealType" "P2PDealType" NOT NULL,
    "status" "P2PDealStatus" NOT NULL DEFAULT 'proposed',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "rateBasis" TEXT,
    "rateAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "stripePaymentIntentId" TEXT,
    "stripeTransferId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "P2PDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "P2PMilestone" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "P2PMilestoneStatus" NOT NULL DEFAULT 'pending',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "P2PMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "P2PQuestionnaireResponse_musicianId_key" ON "P2PQuestionnaireResponse"("musicianId");

-- CreateIndex
CREATE UNIQUE INDEX "P2PMatch_conversationId_key" ON "P2PMatch"("conversationId");

-- CreateIndex
CREATE INDEX "P2PMatch_musicianBId_idx" ON "P2PMatch"("musicianBId");

-- CreateIndex
CREATE INDEX "P2PMatch_status_idx" ON "P2PMatch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "P2PMatch_musicianAId_musicianBId_key" ON "P2PMatch"("musicianAId", "musicianBId");

-- CreateIndex
CREATE INDEX "P2PDeal_matchId_idx" ON "P2PDeal"("matchId");

-- CreateIndex
CREATE INDEX "P2PDeal_status_idx" ON "P2PDeal"("status");

-- CreateIndex
CREATE INDEX "P2PMilestone_dealId_idx" ON "P2PMilestone"("dealId");

-- AddForeignKey
ALTER TABLE "P2PQuestionnaireResponse" ADD CONSTRAINT "P2PQuestionnaireResponse_musicianId_fkey" FOREIGN KEY ("musicianId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "P2PMatch" ADD CONSTRAINT "P2PMatch_musicianAId_fkey" FOREIGN KEY ("musicianAId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "P2PMatch" ADD CONSTRAINT "P2PMatch_musicianBId_fkey" FOREIGN KEY ("musicianBId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "P2PMatch" ADD CONSTRAINT "P2PMatch_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "P2PDeal" ADD CONSTRAINT "P2PDeal_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "P2PMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "P2PMilestone" ADD CONSTRAINT "P2PMilestone_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "P2PDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

