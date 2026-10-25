-- CreateTable
CREATE TABLE "CardFingerprint" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ownerRole" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardFingerprint_fingerprint_idx" ON "CardFingerprint"("fingerprint");

-- CreateIndex
CREATE INDEX "CardFingerprint_userId_idx" ON "CardFingerprint"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CardFingerprint_fingerprint_userId_key" ON "CardFingerprint"("fingerprint", "userId");

