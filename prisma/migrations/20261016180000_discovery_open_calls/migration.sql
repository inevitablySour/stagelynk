ALTER TABLE "MusicianProfile"
  ADD COLUMN "subgenres" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "influences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "favorites" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "performanceFee" DOUBLE PRECISION,
  ADD COLUMN "hourlyFee" DOUBLE PRECISION,
  ADD COLUMN "dayFee" DOUBLE PRECISION;

UPDATE "MusicianProfile" SET "primaryCategory" = replace("primaryCategory", '_', '-');

CREATE TABLE "MusicianEquipmentOwned" (
  "id" TEXT NOT NULL,
  "musicianId" TEXT NOT NULL,
  "equipmentId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "MusicianEquipmentOwned_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MusicianEquipmentOwned_musicianId_fkey" FOREIGN KEY ("musicianId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MusicianEquipmentOwned_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "EquipmentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MusicianEquipmentOwned_musicianId_equipmentId_key" ON "MusicianEquipmentOwned"("musicianId", "equipmentId");
CREATE INDEX "MusicianEquipmentOwned_equipmentId_idx" ON "MusicianEquipmentOwned"("equipmentId");

ALTER TABLE "JobListing"
  ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'Europe/Brussels',
  ADD COLUMN "eventStartsAt" TIMESTAMP(3),
  ADD COLUMN "eventEndsAt" TIMESTAMP(3),
  ADD COLUMN "externalVenueName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "stageSpecs" TEXT NOT NULL DEFAULT '';
ALTER TABLE "JobListing"
  ADD COLUMN "useVenueEquipment" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "eventEquipment" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "JobListingSlot"
  ADD COLUMN "reservedByApplicationId" TEXT,
  ADD COLUMN "budgetMin" DOUBLE PRECISION,
  ADD COLUMN "budgetMax" DOUBLE PRECISION;
CREATE UNIQUE INDEX "JobListingSlot_reservedByApplicationId_key" ON "JobListingSlot"("reservedByApplicationId");
ALTER TABLE "JobApplication"
  ADD COLUMN "availabilityConfirmed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "paymentAttempt" INTEGER NOT NULL DEFAULT 0;

-- Legacy calls without named slots still represent one available place.
INSERT INTO "JobListingSlot" ("id", "jobListingId", "label", "order", "filled", "createdAt", "updatedAt")
SELECT 'default-slot-' || j."id", j."id", 'Performance', 0,
  EXISTS (SELECT 1 FROM "JobApplication" a WHERE a."jobListingId" = j."id" AND a."status" = 'accepted'),
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "JobListing" j
WHERE NOT EXISTS (SELECT 1 FROM "JobListingSlot" s WHERE s."jobListingId" = j."id");

UPDATE "JobApplication" a SET "slotId" = s."id"
FROM "JobListingSlot" s
WHERE a."slotId" IS NULL AND a."jobListingId" = s."jobListingId"
  AND (SELECT count(*) FROM "JobListingSlot" other WHERE other."jobListingId" = a."jobListingId") = 1;

UPDATE "JobListingSlot" s SET "filled" = true
WHERE EXISTS (SELECT 1 FROM "JobApplication" a WHERE a."slotId" = s."id" AND a."status" = 'accepted');

-- Old briefs need review under the new publishing rules. Preserve applications
-- and history, but do not advertise incomplete legacy calls as apply-ready.
UPDATE "JobListing" SET "status" = 'paused'
WHERE "status" = 'published' AND ("eventStartsAt" IS NULL OR "eventEndsAt" IS NULL);
