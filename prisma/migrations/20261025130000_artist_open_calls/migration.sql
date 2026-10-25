-- CreateEnum
CREATE TYPE "ArtistCallDealType" AS ENUM ('rate', 'milestone', 'split_credit');

-- AlterEnum
ALTER TYPE "ConversationKind" ADD VALUE 'open_call';

-- CreateTable
CREATE TABLE "ArtistOpenCall" (
    "id" TEXT NOT NULL,
    "posterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "roleSlug" TEXT NOT NULL,
    "genreSlug" TEXT,
    "timeline" TEXT NOT NULL,
    "dealType" "ArtistCallDealType" NOT NULL,
    "dealDetails" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" "JobListingStatus" NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistOpenCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistOpenCallApplication" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistOpenCallApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtistOpenCall_posterId_idx" ON "ArtistOpenCall"("posterId");

-- CreateIndex
CREATE INDEX "ArtistOpenCall_status_createdAt_idx" ON "ArtistOpenCall"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ArtistOpenCall_roleSlug_idx" ON "ArtistOpenCall"("roleSlug");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistOpenCallApplication_conversationId_key" ON "ArtistOpenCallApplication"("conversationId");

-- CreateIndex
CREATE INDEX "ArtistOpenCallApplication_applicantId_idx" ON "ArtistOpenCallApplication"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "ArtistOpenCallApplication_callId_applicantId_key" ON "ArtistOpenCallApplication"("callId", "applicantId");

-- AddForeignKey
ALTER TABLE "ArtistOpenCall" ADD CONSTRAINT "ArtistOpenCall_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistOpenCallApplication" ADD CONSTRAINT "ArtistOpenCallApplication_callId_fkey" FOREIGN KEY ("callId") REFERENCES "ArtistOpenCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistOpenCallApplication" ADD CONSTRAINT "ArtistOpenCallApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistOpenCallApplication" ADD CONSTRAINT "ArtistOpenCallApplication_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

