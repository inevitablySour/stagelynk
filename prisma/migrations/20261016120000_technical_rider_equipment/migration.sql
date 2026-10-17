-- CreateTable
CREATE TABLE "EquipmentItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Other',

    CONSTRAINT "EquipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicianEquipmentNeed" (
    "id" TEXT NOT NULL,
    "musicianId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "MusicianEquipmentNeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueEquipmentOffering" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "VenueEquipmentOffering_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentItem_name_key" ON "EquipmentItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentItem_slug_key" ON "EquipmentItem"("slug");

-- CreateIndex
CREATE INDEX "EquipmentItem_slug_idx" ON "EquipmentItem"("slug");

-- CreateIndex
CREATE INDEX "EquipmentItem_category_idx" ON "EquipmentItem"("category");

-- CreateIndex
CREATE INDEX "MusicianEquipmentNeed_equipmentId_idx" ON "MusicianEquipmentNeed"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicianEquipmentNeed_musicianId_equipmentId_key" ON "MusicianEquipmentNeed"("musicianId", "equipmentId");

-- CreateIndex
CREATE INDEX "VenueEquipmentOffering_equipmentId_idx" ON "VenueEquipmentOffering"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "VenueEquipmentOffering_venueId_equipmentId_key" ON "VenueEquipmentOffering"("venueId", "equipmentId");

-- AddForeignKey
ALTER TABLE "MusicianEquipmentNeed" ADD CONSTRAINT "MusicianEquipmentNeed_musicianId_fkey" FOREIGN KEY ("musicianId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicianEquipmentNeed" ADD CONSTRAINT "MusicianEquipmentNeed_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "EquipmentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueEquipmentOffering" ADD CONSTRAINT "VenueEquipmentOffering_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "VenueProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueEquipmentOffering" ADD CONSTRAINT "VenueEquipmentOffering_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "EquipmentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

